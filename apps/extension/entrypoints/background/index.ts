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
            // TODO: Implementation for MV3
        });
    },
});
