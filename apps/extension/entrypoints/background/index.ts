// ================================================================================================
// Background Script
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type {
    ContentScriptMessage,
    RunnerWorkerExecMessageData,
    CodeTestResult,
    CodeTestResultWithTLE,
} from "@/utils/runners/types";
import RunnerWorker from "@/utils/runners/worker?worker";

// ----------------------------------------------------------------
// types
// ----------------------------------------------------------------

type ChromeApiLike = {
    runtime?: {
        getURL: (path: string) => string;
        getContexts?: (filter: {
            contextTypes?: string[];
            documentUrls?: string[];
        }) => Promise<unknown[]>;
    };
    offscreen?: {
        createDocument: (options: {
            url: string;
            reasons: string[];
            justification: string;
        }) => Promise<void>;
    };
};

// ----------------------------------------------------------------
// utilities
// ----------------------------------------------------------------

// ----------------------------------------------------------------
// Implementation (background script)
// ----------------------------------------------------------------

export default defineBackground({
    main() {
        console.log("Background script is started.");
        // ----------------------------------------------------------------
        // Workerを保存しておく場所を作る
        // ----------------------------------------------------------------
        let runnerWorker: Worker | null = null;

        // ----------------------------------------------------------------
        // マニフェストバージョンを取得 (MV2/MV3で処理を分けるため)
        // ----------------------------------------------------------------
        const manifestVersion = import.meta.env.MANIFEST_VERSION;

        // ----------------------------------------------------------------
        // MV3 Offscreen Document の生成状態を管理する
        // ----------------------------------------------------------------
        let creatingMv3OffscreenDocument: Promise<void> | null = null;

        // ----------------------------------------------------------------
        // MV3 Offscreen Document が存在することを保証する
        // ----------------------------------------------------------------
        const ensureMv3OffscreenDocument = async () => {
            const chromeApi = (globalThis as { chrome?: ChromeApiLike }).chrome;
            if (!chromeApi?.runtime) {
                throw new Error("Chrome runtime API is unavailable in MV3 background context.");
            }
            if (!chromeApi.offscreen?.createDocument) {
                throw new Error("Chrome offscreen API is unavailable in MV3 background context.");
            }

            const offscreenPath = "mv3_runner.html";
            const offscreenUrl = chromeApi.runtime.getURL(offscreenPath);
            if (typeof chromeApi.runtime.getContexts === "function") {
                const contexts = await chromeApi.runtime.getContexts({
                    contextTypes: ["OFFSCREEN_DOCUMENT"],
                    documentUrls: [offscreenUrl],
                });
                if (contexts.length > 0) {
                    return;
                }
            }

            if (!creatingMv3OffscreenDocument) {
                creatingMv3OffscreenDocument = chromeApi.offscreen
                    .createDocument({
                        url: offscreenPath,
                        reasons: ["WORKERS"],
                        justification: "Run code tests in an MV3 offscreen document.",
                    })
                    .catch((error) => {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        if (
                            !errorMessage.includes("Only a single offscreen document") &&
                            !errorMessage.includes("single offscreen document")
                        ) {
                            throw error;
                        }
                    })
                    .finally(() => {
                        creatingMv3OffscreenDocument = null;
                    });
            }
            await creatingMv3OffscreenDocument;
        };

        // ----------------------------------------------------------------
        // メッセージハンドラの登録 (MV2版)
        // ----------------------------------------------------------------
        browser.runtime.onMessage.addListener(async (message, sender) => {
            // ==== exec メッセージ以外は無視 ====
            if (message.type !== "exec") return;
            // ==== MV2でない場合は無視 ====
            if (manifestVersion !== 2) return;
            // ==== メッセージからコード実行に必要な情報を取り出す ====
            const { language, code, stdin, timeLimitMs } = message as ContentScriptMessage;
            // ==== Workerがまだ生成されていない場合は生成する ====
            if (!runnerWorker) {
                runnerWorker = new RunnerWorker();
            }
            // ==== Workerにコード実行を依頼する ====
            const execMessageData = {
                type: "exec",
                language,
                code,
                stdin,
            } as RunnerWorkerExecMessageData;
            runnerWorker.postMessage(execMessageData);
            // ==== Workerからreadyメッセージが来るのを待つ ====
            await new Promise<void>((resolve) => {
                runnerWorker?.addEventListener("message", function handleMessage(event) {
                    if (event.data?.type === "ready") {
                        runnerWorker?.removeEventListener("message", handleMessage);
                        resolve();
                    }
                });
            });
            // ==== readyメッセージを受信したら、打ち切りPromiseとresult待ちPromiseをraceさせる ====
            const waitForResult = new Promise<CodeTestResult>((resolve) => {
                runnerWorker?.addEventListener("message", function handleMessage(event) {
                    if (event.data?.type === "result") {
                        runnerWorker?.removeEventListener("message", handleMessage);
                        resolve(event.data?.data as CodeTestResult);
                    }
                });
            });
            const timeoutPromise = new Promise<CodeTestResultWithTLE>((resolve) => {
                setTimeout(() => {
                    resolve({
                        status: "failure",
                        details: {
                            kind: "TLE",
                            message: `Time limit (${timeLimitMs}ms) exceeded`,
                        },
                    });
                }, timeLimitMs);
            });
            const raceResult = await Promise.race([waitForResult, timeoutPromise]);
            // ==== 結果をContent Scriptに返す ====
            if (sender.tab?.id) {
                await browser.tabs.sendMessage(sender.tab.id, raceResult as CodeTestResultWithTLE);
            } else {
                console.error("Cannot send execution result: sender does not have a tab ID.");
            }
        });

        // ----------------------------------------------------------------
        // メッセージハンドラの登録 (MV3版)
        // ----------------------------------------------------------------
        browser.runtime.onMessage.addListener(async (message, sender) => {
            // ==== exec メッセージ以外は無視 ====
            if (message.type !== "exec") return;
            // ==== MV3でない場合は無視 ====
            if (manifestVersion !== 3) return;
            // ==== Content Script起点のメッセージのみ処理する ====
            if (typeof sender.tab?.id !== "number") return;

            const tabId = sender.tab.id;
            const execMessage = message as ContentScriptMessage;
            try {
                // ==== Offscreen Documentを起動し、execを転送する ====
                await ensureMv3OffscreenDocument();
                const offscreenResult =
                    (await browser.runtime.sendMessage(execMessage)) as CodeTestResultWithTLE;
                // ==== 返ってきた結果をそのままContent Scriptへ渡す ====
                await browser.tabs.sendMessage(tabId, offscreenResult);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const failureResult: CodeTestResultWithTLE = {
                    status: "failure",
                    details: {
                        kind: "CE",
                        message: `Failed to run code test in MV3: ${errorMessage}`,
                    },
                };
                await browser.tabs.sendMessage(tabId, failureResult);
            }
        });
    },
});
