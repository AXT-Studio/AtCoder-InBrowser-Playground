// ================================================================================================
// MV3 Offscreen Document (Code Test Runner)
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

let runnerWorker: Worker | null = null;

const execute = async (message: RunnerWorkerExecMessageData): Promise<CodeTestResultWithTLE> => {
    const { language, code, stdin, timeLimitMs } = message as ContentScriptMessage;
    try {
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
        // ==== 結果をBackground Scriptに返す ====
        return raceResult as CodeTestResultWithTLE;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return asCompileErrorResult(errorMessage);
    }
};

browser.runtime.onMessage.addListener((message, sender) => {
    // ==== exec メッセージ以外は無視 ====
    if (message.type !== "exec") return;
    // ==== Content Scriptから直接来たものは無視し、Backgroundからの転送のみ処理する ====
    if (typeof sender.tab?.id === "number") return;
    // ==== MV2でもMV3でもない場合は無視 ====
    const manifestVersion = import.meta.env.MANIFEST_VERSION;
    if (manifestVersion !== 2 && manifestVersion !== 3) return;

    // ==== コード実行処理を呼び出す ====
    const result = execute(message as RunnerWorkerExecMessageData);
    // ==== 結果をContent Scriptに返す ====
    return result;
});
