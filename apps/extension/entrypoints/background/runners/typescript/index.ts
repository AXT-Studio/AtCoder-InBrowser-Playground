// ================================================================================================
// Runner Module: TypeScript
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import coreJsPolyfill from "virtual:corejs-polyfill";
import quickJSVariant from "@jitl/quickjs-singlefile-browser-release-sync";
import {
    initialize as esbuildInitialize,
    transform as esbuildTransform,
} from "esbuild-wasm";
import esbuildWasmURL from "esbuild-wasm/esbuild.wasm?url&no-inline";
import inspectUtil from "node-inspect-extracted";
import type { QuickJSContext } from "quickjs-emscripten-core";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import type { Runner, RunnerResult } from "../types";

// ----------------------------------------------------------------
// types
// ----------------------------------------------------------------

/** TypeScriptのRunnerに必要なRunnerContext。quickJSのVMを保持する */
type TypeScriptRunnerContext = {
    quickJsVm: QuickJSContext;
};

// ----------------------------------------------------------------
// utilities
// ----------------------------------------------------------------

/** JavaScriptオブジェクトを標準出力風の文字列に変換します (node-inspect-extractedを使用) */
const stringifyJSObject = (obj: any): string => {
    if (typeof obj === "string") {
        return obj;
    }
    return inspectUtil.inspect(obj, false, null, false);
};

/** TS/JSコードをES2023相当までダウンコンパイルします (esbuild-wasmを使用) */
const downCompileCode = async (code: string): Promise<string> => {
    // esbuild-wasmの初期化 (初回のみ)
    // 2回目以降はエラーが出るので、try-catchで捻り潰す
    try {
        await esbuildInitialize({
            wasmURL: esbuildWasmURL,
            worker: false, // このコード自体がメインから分離されているのでworkerは使用しない というかworker使えない
        });
    } catch (_error) {
        // 初期化に失敗してもエラーを無視する (すでに初期化されている場合はエラーが出るため)
    }
    // コードの変換
    const result = await esbuildTransform(code, {
        loader: "ts",
        target: "es2023",
    });
    if (result === null || typeof result.code !== "string") {
        throw new Error("esbuild transformation failed");
    }
    return result.code;
};

/** コードをQuickJSで実行できる形に変換します。 */
const preProcessCodeForQuickJS = async (code: string): Promise<string> => {
    // ==== Main呼び出しについて、Main(__stdin__)に置き換える ====
    const patterns = [
        // Node.js: Main(require("fs").readFileSync("/dev/stdin", "utf8"));
        /Main\s*\(\s*require\s*\(\s*['"]fs['"]\s*\)\.readFileSync\s*\(\s*['"]\/dev\/stdin['"]\s*,\s*['"]utf8['"]\s*\)\s*\);?/g,
        // Deno: Main(await Deno.readTextFile("/dev/stdin"));
        /Main\s*\(\s*await\s+Deno\.readTextFile\s*\(\s*['"]\/dev\/stdin['"]\s*\)\s*\);?/g,
        // Bun: Main(await Bun.file("/dev/stdin").text());
        /Main\s*\(\s*await\s+Bun\.file\s*\(\s*['"]\/dev\/stdin['"]\s*\)\.text\s*\(\s*\)\s*\);?/g,
    ];
    let result = code;
    for (const pattern of patterns) {
        result = result.replace(pattern, "Main(__stdin__)");
    }
    // ==== ダウンコンパイルに通す ====
    result = await downCompileCode(result);
    // ==== QuickJSはTop-Level exportをサポートしてないかも 念の為削除 ====
    result = result.replace(/^export\s*\{\s*\}\s*;?/m, "");
    result = result.replace(/^export\s+/gm, "");
    // ==== 全体をIIFEで包む (グローバル汚染防止 & 2回目以降の実行での再宣言扱いを回避) ====
    result = `(function() {\n${result}\n})();`;
    // ==== 変換後のコードを返す ====
    return result;
};

// ----------------------------------------------------------------
// init()
// コード実行に必要な初期化処理を行い、Contextを返す。
// ----------------------------------------------------------------

export const init = async (): Promise<TypeScriptRunnerContext> => {
    // ==== QuickJSの初期化 ====
    const quickJs = await newQuickJSWASMModuleFromVariant(quickJSVariant);
    const quickJsRuntime = quickJs.newRuntime();
    quickJsRuntime.setMemoryLimit(1024 * 1024 * 1024); // メモリ制限 1024MiB (一般的なAtCoderの問題と同じ)
    quickJsRuntime.setMaxStackSize(0); // スタックサイズ制限解除
    const quickJsVm = quickJsRuntime.newContext();
    // ==== core-jsのPolyfillコードをQuickJSのグローバルに評価して、Polyfillを適用する ====
    const coreJsPolyfillResult = quickJsVm.evalCode(
        coreJsPolyfill,
        "core-js-polyfill.js",
    );
    if (coreJsPolyfillResult.error) {
        console.error(
            "Failed to apply core-js polyfill:",
            quickJsVm.dump(coreJsPolyfillResult.error),
        );
        throw new Error("Failed to apply core-js polyfill");
    }
    // ==== Contextを返す ====
    return {
        quickJsVm,
    };
};

// ----------------------------------------------------------------
// run()
// Contextを用いてコードを実行し、結果を返す。
// ----------------------------------------------------------------

export const run: Runner<TypeScriptRunnerContext> = async (
    { context, code, stdin },
) => {
    // ==== 初手全体try-catch なにかあったらCE扱いでエラー返す ====
    try {
        // ==== contextにquickJsVmがあることを保証する (型定義上はあるはず) ====
        if (!context.quickJsVm) {
            throw new Error("Runner context is missing quickJsVm");
        }
        const { quickJsVm } = context;
        // ==== stdout, stderrのキャプチャのために配列を用意 ====
        const stdoutArray: unknown[][] = [];
        const stderrArray: unknown[][] = [];
        // ==== console.logとconsole.errorをオーバーライドして、stdout/stderrArrayに投げ込むようにする ====
        // biome-ignore lint/suspicious/noExplicitAny: 向こう側がanyなんだからしょうがないだろ
        const logFn = quickJsVm.newFunction("log", (...args: any[]) => {
            stdoutArray.push(
                args.map((arg) => {
                    if (!quickJsVm) return "";
                    return quickJsVm.dump(arg);
                }),
            );
        });
        // biome-ignore lint/suspicious/noExplicitAny: 向こう側がanyなんだからしょうがないだろ その2
        const errorFn = quickJsVm.newFunction("error", (...args: any[]) => {
            stderrArray.push(
                args.map((arg) => {
                    if (!quickJsVm) return "";
                    return quickJsVm.dump(arg);
                }),
            );
        });
        const consoleObj = quickJsVm.newObject();
        quickJsVm.setProp(consoleObj, "log", logFn);
        quickJsVm.setProp(consoleObj, "error", errorFn);
        quickJsVm.setProp(quickJsVm.global, "console", consoleObj);
        // ==== stdinをグローバル変数__stdin__にセット ====
        quickJsVm.setProp(
            quickJsVm.global,
            "__stdin__",
            quickJsVm.newString(stdin),
        );
        // ==== codeを実行 ====
        const preProcessedCode = await preProcessCodeForQuickJS(code);
        const result = quickJsVm.evalCode(preProcessedCode, "Main.js");
        // ==== 実行結果に応じてSuccess/Failureを返す ====
        if (result.error) {
            // ---- エラー発生 -> Failure(RE)を返す ----
            const error = quickJsVm.dump(result.error);
            const notifyResult: Awaited<RunnerResult> = {
                status: "failure",
                error: {
                    errorType: "RE",
                    error: typeof error === "string"
                        ? error
                        : JSON.stringify(error),
                },
            };
            return notifyResult;
        } else {
            // ---- 正常終了 -> Successを返す ----
            // stdout, stderrの内容を文字列に変換
            const stdout = stdoutArray
                .map((args) => args.map(stringifyJSObject).join(" "))
                .join("\n");
            const stderr = stderrArray
                .map((args) => args.map(stringifyJSObject).join(" "))
                .join("\n");
            // resultオブジェクトを作成して返す
            const notifyResult: Awaited<RunnerResult> = {
                status: "success",
                data: {
                    stdout,
                    stderr,
                },
            };
            return notifyResult;
        }
    } catch (error) {
        // ==== なにかあってエラーとなった場合、CE扱いでエラーを返す ====
        const result: Awaited<RunnerResult> = {
            status: "failure",
            error: {
                errorType: "CE",
                error: error instanceof Error ? error.message : String(error),
            },
        };
        return result;
    }
};

// ----------------------------------------------------------------
// export
// ----------------------------------------------------------------
export default { init, run };
