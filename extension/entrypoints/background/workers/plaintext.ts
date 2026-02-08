// ================================================================================================
// entrypoints/workers/plaintext.ts
// Runner Worker: Plain Text
// ================================================================================================
// ----------------------------------------------------------------
// 起動 -> worker-ready
// (コードを渡されたらすぐ実行できるように準備しておく)
// ----------------------------------------------------------------

// ==== plaintextのWorkerはとくに準備をしなくていいので、すぐにreadyを返す ====

console.log("Plaintext worker starting...");

self.postMessage({
    type: "worker-ready",
    payload: {
        language: "plaintext",
    },
});

// ----------------------------------------------------------------
// worker-run -> 実行 -> worker-result / worker-error
// 実行要求を受け取ったらコードを実行して結果を返す
// ----------------------------------------------------------------

self.addEventListener("message", async (event) => {
    const message = event.data;
    if (message.type === "worker-run") {
        const code: string = message.payload.code;
        const stdin: string = message.payload.stdin;
        try {
            // ==== Plain Textは実行しないので、そのままstdoutにコードを返す ====
            const stdout = code;
            const stderr = "";
            const exitCode = 0;
            // ==== 実行結果を返す ====
            self.postMessage({
                type: "worker-result",
                payload: {
                    stdout,
                    stderr,
                    exitCode,
                },
            });
        } catch (error) {
            // ==== エラーが発生した場合はworker-errorを返す ====
            self.postMessage({
                type: "worker-error",
                payload: {
                    error: (error as Error).message,
                },
            });
        }
    }
});
