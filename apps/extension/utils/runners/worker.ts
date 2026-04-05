// ================================================================================================
// Runner Worker
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

// ---- 各言語のRunner Moduleをインポート ----
import { init as init_typescript, run as run_typescript } from "./typescript/module";
import { init as init_python, run as run_python } from "./python/module";
import { init as init_plaintext, run as run_plaintext } from "./plaintext/module";
import type { CodeTestContext, RunnerWorkerExecMessageData, CodeTestResult } from "./types";

// ----------------------------------------------------------------
// utilities
// ----------------------------------------------------------------

// ==== 言語ごとのContextのキャッシュ ====
const contextCache = new Map<keyof CodeTestContext, CodeTestContext[keyof CodeTestContext]>();

// ----------------------------------------------------------------
// implementation
// ----------------------------------------------------------------

// ==== Worker呼び出し元から exec メッセージを受信したら、コードを実行して結果を result メッセージで返す ====
self.addEventListener("message", async (event: MessageEvent) => {
    // ==== exec メッセージ以外は無視 ====
    if (event.data?.type !== "exec") return;
    const { language, code, stdin } = event.data as RunnerWorkerExecMessageData;
    // ==== try-catchで全体を包んで、何かあったらCE扱いでエラーを返す ====
    try {
        console.log(`[Worker] Received exec message for language "${language}":`, { code, stdin });
        // ==== Contextの取得 ====
        const usingContext = await (async () => {
            // ---- すでにキャッシュされているContextがあればそれを返す ----
            if (contextCache.has(language)) {
                // biome-ignore lint/style/noNonNullAssertion: has()で存在確認しているので存在を保証できる
                return contextCache.get(language)!;
            }
            console.log(`[Worker] No cached context for language "${language}". Initializing...`);
            // ---- 未キャッシュならRunner Moduleのinit()を呼び出してContextを生成し、キャッシュに保存してから返す ----
            const context = (await (async () => {
                switch (language) {
                    case "typescript":
                        return init_typescript();
                    case "python":
                        return init_python();
                    case "plaintext":
                        return init_plaintext();
                    default:
                        throw new Error(`Unsupported language: ${language}`);
                }
            })()) as CodeTestContext[keyof CodeTestContext];
            console.log(`[Worker] Context for language "${language}" initialized:`, context);
            contextCache.set(language, context);
            return context;
        })();
        // ==== 実行準備が完了した(打ち切り計測を開始して良い)ことを伝えるメッセージを呼び出し元に投げる ====
        self.postMessage({
            type: "ready",
        });
        console.log(
            `[Worker] Context for language "${language}" is ready. Starting code execution...`,
            usingContext,
        );
        // ==== Runner Moduleのrun()を呼び出してコードを実行し、結果を受け取る ====
        const result = await (() => {
            if (language === "typescript") {
                const context = usingContext as CodeTestContext["typescript"];
                return run_typescript({ code, context, stdin });
            } else if (language === "python") {
                const context = usingContext as CodeTestContext["python"];
                return run_python({ code, context, stdin });
            } else if (language === "plaintext") {
                const context = usingContext as CodeTestContext["plaintext"];
                return run_plaintext({ code, context, stdin });
            } else {
                throw new Error(`Unsupported language: ${language}`);
            }
        })();
        // ==== 結果を result メッセージで送信 ====
        const resultMessageData: CodeTestResult = result;
        self.postMessage({
            type: "result",
            data: resultMessageData,
        });
    } catch (error) {
        // ==== 何かエラーが起きたらCE扱いでエラーを返す ====
        const errorMessage = error instanceof Error ? error.message : String(error);
        const resultMessageData: CodeTestResult = {
            status: "failure",
            details: {
                kind: "CE",
                message: errorMessage,
            },
        };
        self.postMessage({
            type: "result",
            data: resultMessageData,
        });
    }
});
