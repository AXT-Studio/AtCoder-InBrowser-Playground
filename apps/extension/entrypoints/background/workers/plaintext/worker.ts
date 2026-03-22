// ================================================================================================
// Runner Worker: Plain Text
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { Failure, Result, Success } from "./../../../../types/Result";

// ----------------------------------------------------------------
// ## Worker Initialization Protocol
// 起動
// -> コードを渡されたらすぐ実行できるよう事前準備を行う
// -> notify-initializedを送る
// ----------------------------------------------------------------

console.log("Plaintext worker starting...");

// ==== plaintextのWorkerはとくに準備をしなくていいので、すぐにreadyを返す ====
self.postMessage({
    type: "notify-initialized",
    payload: {
        id: crypto.randomUUID(),
        language: "plaintext",
    },
});

// ----------------------------------------------------------------
// ## Worker Run Protocol
// request-runを受け取る
// -> コードを実行する
// -> notify-outputを送る
// ----------------------------------------------------------------

self.addEventListener("message", async (event) => {
    const { type, payload } = event.data;
    if (type === "request-run") {
        const { id, code, stdin } = payload;
        // console.log(`[Worker] Received request-run: id=${id}, code=${code}, stdin=${stdin}`);
        // ==== Plain Textは実行しないので、そのままstdoutにコードを返す ====
        const result: Result<
            { stdout: string; stderr: string },
            { errorType: "TLE" | "RE" | "CE"; error: string }
        > = {
            status: "success",
            data: {
                stdout: code,
                stderr: "",
            },
        };
        // ==== 結果を返す ====
        self.postMessage({
            type: "notify-output",
            payload: {
                id,
                result,
            },
        });
    }
});
