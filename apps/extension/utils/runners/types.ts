import type { PyodideInterface } from "pyodide";
import type { QuickJSContext } from "quickjs-emscripten-core";

/** 各言語におけるコードテストの実行に必要なコンテキスト */
export type CodeTestContext = {
    // biome-ignore lint/complexity/noBannedTypes: plaintextでは空のオブジェクトを返してほしいので許容
    plaintext: {};
    typescript: {
        quickJsVm: QuickJSContext;
    };
    python: {
        pyodide: PyodideInterface;
    };
};

/** Runner Moduleの run() が返す結果。Runner Workerが送信するresultメッセージのevent.dataが与える型でもある */
export type CodeTestResult = Result<
    {
        stdout: string;
        stderr: string;
    },
    {
        kind: "CE" | "RE";
        message: string;
    }
>;

/** Background Script・Offscreen Documentで使用するコードテスト結果の型 */
export type CodeTestResultWithTLE = Result<
    {
        stdout: string;
        stderr: string;
    },
    {
        kind: "CE" | "RE" | "TLE";
        message: string;
    }
>;

/** Runner Moduleの run() メソッドの型 */
export type Runner<L extends keyof CodeTestContext> = (params: {
    code: string;
    context: CodeTestContext[L];
    stdin: string;
}) => Promise<CodeTestResult>;

/** Runner Workerが受信するexecメッセージのevent.dataに要求する型 */
export type RunnerWorkerExecMessageData = {
    type: "exec";
    language: keyof CodeTestContext;
    code: string;
    stdin: string;
};

/** Content ScriptからBackground Script・Offscreen Documentにわたすメッセージの型 */
export type ContentScriptMessage = {
    type: "exec";
    language: keyof CodeTestContext;
    code: string;
    stdin: string;
    timeLimitMs: number;
};
