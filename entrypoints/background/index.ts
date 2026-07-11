import { runInWorker } from "@/utils/execution/host/runInWorker";
import type {
    CodeTestResult,
    ExecInOffscreenMessage,
    ExecRequestMessage,
    ExecResponseMessage,
} from "@/utils/execution/types";

type ChromeOffscreenApi = {
    runtime: {
        getURL: (path: string) => string;
        getContexts?: (filter: {
            contextTypes?: string[];
            documentUrls?: string[];
        }) => Promise<unknown[]>;
    };
    offscreen: {
        createDocument: (options: {
            url: string;
            reasons: string[];
            justification: string;
        }) => Promise<void>;
    };
};

const OFFSCREEN_PATH = "offscreen.html";

const asCeResponse = (id: string, message: string): ExecResponseMessage => ({
    type: "execResponse",
    id,
    codeTestResult: {
        status: "CE",
        execTime: -1,
        stdout: "",
        stderr: message,
    } satisfies CodeTestResult,
});

export default defineBackground(() => {
    const manifestVersion = import.meta.env.MANIFEST_VERSION;
    let creatingOffscreen: Promise<void> | null = null;

    const ensureOffscreenDocument = async () => {
        const chromeApi = (globalThis as { chrome?: ChromeOffscreenApi }).chrome;
        if (!chromeApi?.offscreen?.createDocument) {
            throw new Error("Chrome offscreen API is unavailable.");
        }

        const offscreenUrl = chromeApi.runtime.getURL(OFFSCREEN_PATH);
        if (typeof chromeApi.runtime.getContexts === "function") {
            const contexts = await chromeApi.runtime.getContexts({
                contextTypes: ["OFFSCREEN_DOCUMENT"],
                documentUrls: [offscreenUrl],
            });
            if (contexts.length > 0) {
                return;
            }
        }

        if (!creatingOffscreen) {
            creatingOffscreen = chromeApi.offscreen
                .createDocument({
                    url: OFFSCREEN_PATH,
                    reasons: ["WORKERS"],
                    justification: "Run code tests in an MV3 offscreen document.",
                })
                .catch((error: unknown) => {
                    const msg = error instanceof Error ? error.message : String(error);
                    // 競合で既に存在する場合は無視
                    if (!msg.includes("Only a single offscreen") && !msg.includes("single offscreen")) {
                        throw error;
                    }
                })
                .finally(() => {
                    creatingOffscreen = null;
                });
        }
        await creatingOffscreen;
    };

    const execFirefox = async (req: ExecRequestMessage): Promise<ExecResponseMessage> => {
        const codeTestResult = await runInWorker({
            id: req.id,
            language: req.language,
            code: req.code,
            stdin: req.stdin,
            timeLimitMs: req.timeLimitMs,
        });
        return {
            type: "execResponse",
            id: req.id,
            codeTestResult,
        };
    };

    const execChrome = async (req: ExecRequestMessage): Promise<ExecResponseMessage> => {
        await ensureOffscreenDocument();
        const forward: ExecInOffscreenMessage = {
            type: "execInOffscreen",
            id: req.id,
            language: req.language,
            code: req.code,
            stdin: req.stdin,
            timeLimitMs: req.timeLimitMs,
        };
        const res = (await browser.runtime.sendMessage(forward)) as ExecResponseMessage | undefined;
        if (res == null || res.type !== "execResponse") {
            return asCeResponse(req.id, "No response from offscreen document.");
        }
        return res;
    };

    browser.runtime.onMessage.addListener((message, sender) => {
        if (message?.type !== "execRequest") return;
        // Content Script 起点のみ（Offscreen 転送のエコーは無視）
        if (typeof sender.tab?.id !== "number") return;

        const req = message as ExecRequestMessage;

        const run = manifestVersion === 3 ? execChrome(req) : execFirefox(req);
        return run.catch((error: unknown) =>
            asCeResponse(req.id, error instanceof Error ? error.message : String(error)),
        );
    });
});
