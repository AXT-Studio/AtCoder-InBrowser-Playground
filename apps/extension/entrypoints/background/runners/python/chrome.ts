// ================================================================================================
// Runner Module: Python (Chrome MV3 ver.)
// Chrome/Chromium MV3ではBackground(Service Worker)でPyodide実行が難しいため、
// Offscreen Documentへ処理を委譲する。
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { Runner } from "../types";
import {
    MV3_PYTHON_RUNNER_DOCUMENT_PATH,
    PYTHON_OFFSCREEN_REQUEST_TYPE,
    PYTHON_OFFSCREEN_RESPONSE_TYPE,
    type PythonOffscreenRequestMessage,
    type PythonOffscreenRequestPayload,
    type PythonOffscreenRequestPayloadWithoutRequestId,
    type PythonOffscreenResponseMessage,
    type PythonOffscreenRunResponseData,
    type PythonRunnerContext,
} from "./protocol";

// ----------------------------------------------------------------
// constants
// ----------------------------------------------------------------

const OFFSCREEN_SEND_RETRY_INTERVAL_MS = 50;
const OFFSCREEN_SEND_RETRY_COUNT = 30;
const OFFSCREEN_RESPONSE_TIMEOUT_MS = 5 * 60 * 1000;

// ----------------------------------------------------------------
// types
// ----------------------------------------------------------------

type ChromeOffscreenApi = {
    hasDocument?: () => Promise<boolean>;
    createDocument: (options: {
        url: string;
        reasons: string[];
        justification: string;
    }) => Promise<void>;
};

type ChromeGlobalWithOffscreen = typeof globalThis & {
    chrome?: {
        offscreen?: ChromeOffscreenApi;
    };
};

// ----------------------------------------------------------------
// helpers
// ----------------------------------------------------------------

let ensureOffscreenDocumentPromise: Promise<void> | undefined;

const sleep = async (milliseconds: number): Promise<void> =>
    await new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

const getChromeOffscreenApi = (): ChromeOffscreenApi | undefined => {
    const chromeGlobal = globalThis as ChromeGlobalWithOffscreen;
    return chromeGlobal.chrome?.offscreen;
};

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const isReceivingEndError = (error: unknown): boolean => {
    const message = getErrorMessage(error);
    return message.includes("Receiving end does not exist");
};

const isPythonOffscreenResponseMessage = (
    message: unknown,
): message is PythonOffscreenResponseMessage => {
    if (!isObjectRecord(message)) {
        return false;
    }
    if (message.type !== PYTHON_OFFSCREEN_RESPONSE_TYPE) {
        return false;
    }
    if (!isObjectRecord(message.payload)) {
        return false;
    }
    return typeof message.payload.requestId === "string";
};

const ensureOffscreenDocument = async (): Promise<void> => {
    if (ensureOffscreenDocumentPromise) {
        return ensureOffscreenDocumentPromise;
    }
    ensureOffscreenDocumentPromise = (async () => {
        const offscreenApi = getChromeOffscreenApi();
        if (!offscreenApi) {
            throw new Error("Offscreen API is unavailable in this environment.");
        }

        if (offscreenApi.hasDocument) {
            const hasDocument = await offscreenApi.hasDocument();
            if (hasDocument) {
                return;
            }
        }

        await offscreenApi.createDocument({
            url: MV3_PYTHON_RUNNER_DOCUMENT_PATH,
            reasons: ["WORKERS"],
            justification: "Run Pyodide for Python test execution in MV3.",
        });
    })();

    try {
        await ensureOffscreenDocumentPromise;
    } finally {
        ensureOffscreenDocumentPromise = undefined;
    }
};

const sendMessageToOffscreenWithRetry = async (
    message: PythonOffscreenRequestMessage,
): Promise<void> => {
    for (let i = 0; i <= OFFSCREEN_SEND_RETRY_COUNT; i++) {
        try {
            await browser.runtime.sendMessage(message);
            return;
        } catch (error) {
            if (!isReceivingEndError(error) || i === OFFSCREEN_SEND_RETRY_COUNT) {
                throw error;
            }
            await sleep(OFFSCREEN_SEND_RETRY_INTERVAL_MS);
        }
    }
};

const callOffscreen = async <TResponseData>(
    payload: PythonOffscreenRequestPayloadWithoutRequestId,
): Promise<TResponseData> => {
    await ensureOffscreenDocument();

    const requestId = crypto.randomUUID();
    const message: PythonOffscreenRequestMessage = {
        type: PYTHON_OFFSCREEN_REQUEST_TYPE,
        payload: {
            ...payload,
            requestId,
        } as PythonOffscreenRequestPayload,
    };

    return await new Promise<TResponseData>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            browser.runtime.onMessage.removeListener(listener);
            reject(new Error("Timed out while waiting for offscreen response."));
        }, OFFSCREEN_RESPONSE_TIMEOUT_MS);

        const listener = (runtimeMessage: unknown): void => {
            if (!isPythonOffscreenResponseMessage(runtimeMessage)) {
                return;
            }
            if (runtimeMessage.payload.requestId !== requestId) {
                return;
            }

            browser.runtime.onMessage.removeListener(listener);
            clearTimeout(timeoutId);

            if (runtimeMessage.payload.ok) {
                resolve(runtimeMessage.payload.data as TResponseData);
                return;
            }
            reject(new Error(runtimeMessage.payload.error));
        };

        browser.runtime.onMessage.addListener(listener);
        void sendMessageToOffscreenWithRetry(message).catch((error: unknown) => {
            browser.runtime.onMessage.removeListener(listener);
            clearTimeout(timeoutId);
            reject(new Error(getErrorMessage(error)));
        });
    });
};

// ----------------------------------------------------------------
// init()
// ----------------------------------------------------------------

export const init = async (): Promise<PythonRunnerContext> => {
    return await callOffscreen<PythonRunnerContext>({ action: "init" });
};

// ----------------------------------------------------------------
// run()
// ----------------------------------------------------------------

export const run: Runner<PythonRunnerContext> = async ({ context, code, stdin }) => {
    try {
        return await callOffscreen<PythonOffscreenRunResponseData>({
            action: "run",
            pyodideInterfaceID: context.pyodideInterfaceID,
            code,
            stdin,
        });
    } catch (error) {
        return {
            status: "failure",
            error: {
                errorType: "RE",
                error: getErrorMessage(error),
            },
        };
    }
};

// ----------------------------------------------------------------
// export
// ----------------------------------------------------------------

export default { init, run };
