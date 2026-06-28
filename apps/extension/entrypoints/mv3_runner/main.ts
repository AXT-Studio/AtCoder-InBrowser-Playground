// ================================================================================================
// MV3 Offscreen Document (Code Test Runner)
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type {
    ContentScriptMessage,
    RunnerWorkerExecMessageData,
    CodeTestResultWithTLE,
} from "@/utils/runners/types";
import { createRunnerWorkerExecutor } from "@/utils/runners/executeWithRunnerWorker";
import RunnerWorker from "@/utils/runners/worker?worker";

// ----------------------------------------------------------------
// utilities
// ----------------------------------------------------------------

const asCompileErrorResult = (message: string): CodeTestResultWithTLE => {
    return {
        status: "failure",
        details: {
            kind: "CE",
            message,
        },
    };
};

// ----------------------------------------------------------------
// implementation
// ----------------------------------------------------------------

const executeWithRunnerWorker = createRunnerWorkerExecutor(() => new RunnerWorker());

const execute = async (message: RunnerWorkerExecMessageData): Promise<CodeTestResultWithTLE> => {
    const { language, code, stdin, timeLimitMs } = message as ContentScriptMessage;
    try {
        return await executeWithRunnerWorker({ language, code, stdin, timeLimitMs });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return asCompileErrorResult(errorMessage);
    }
};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // ==== exec メッセージ以外は無視 ====
    if (message.type !== "exec") return;
    // ==== Content Scriptから直接来たものは無視し、Backgroundからの転送のみ処理する ====
    if (typeof sender.tab?.id === "number") return;
    // ==== MV2でもMV3でもない場合は無視 ====
    const manifestVersion = import.meta.env.MANIFEST_VERSION;
    if (manifestVersion !== 2 && manifestVersion !== 3) return;

    // ==== コード実行処理を呼び出す ====
    void execute(message as RunnerWorkerExecMessageData)
        .then((result) => {
            sendResponse(result);
        })
        .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            sendResponse(asCompileErrorResult(errorMessage));
        });
    return true;
});
