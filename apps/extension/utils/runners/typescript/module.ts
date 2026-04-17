// ================================================================================================
// Runner Module: TypeScript
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { CodeTestContext, Runner } from "../types";

// ----------------------------------------------------------------
// utilities
// ----------------------------------------------------------------

import { inspect } from "loupe";

/** JavaScriptオブジェクトを標準出力風の文字列に変換します (loupeを使用) */
const stringifyJSObject = (data: unknown): string => {
    // string -> そのまま返す
    if (typeof data === "string") {
        return data;
    }
    // 0 -> +0になっちゃうので特例で"0"を返す
    if (data === 0) {
        return "0";
    }
    // Error -> 一応自前シリアライズを入れておく
    if (data instanceof Error) {
        return `${data.name}: ${data.message}\n[Stack]\n${data.stack}\n[Cause]\n${data.cause}`;
    }
    // それ以外 -> loupeで文字列化する
    return inspect(data);
};

import { initialize as esbuildInitialize, transform as esbuildTransform } from "esbuild-wasm";
import esbuildWasmURL from "esbuild-wasm/esbuild.wasm?url&no-inline";

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
        // 初期化に失敗してもエラーを無視する (すでに初期化されている場合はエラーが出るが、別にそれでいい)
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
    /*
    以下の3パターンのいずれかにマッチするコードは、標準入力をすべて受け取るコードとみなす。
    1. Node.js向け: `require("fs").readFileSync("/dev/stdin", "utf8")`
    2. Deno向け: `await Deno.readTextFile("/dev/stdin")`
    3. Bun向け: `await Bun.file("/dev/stdin").text()`
    テスト実行環境ではグローバル変数`__stdin__`に標準入力を入れておくので、これらの文字列を全て`(__stdin__)`に置き換える。
     */
    const patterns = [
        // Node.js向け
        `require("fs").readFileSync("/dev/stdin", "utf8")`,
        // Deno向け
        `await Deno.readTextFile("/dev/stdin")`,
        // Bun向け
        `await Bun.file("/dev/stdin").text()`,
    ];
    let result = code;
    for (const pattern of patterns) {
        result = result.replaceAll(pattern, "(__stdin__)");
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

import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import quickJSVariant from "@jitl/quickjs-singlefile-browser-release-sync";
import coreJsPolyfill from "virtual:corejs-polyfill";

export const init = async (): Promise<CodeTestContext["typescript"]> => {
    // ==== QuickJSの初期化 ====
    const quickJs = await newQuickJSWASMModuleFromVariant(quickJSVariant);
    const quickJsRuntime = quickJs.newRuntime();
    quickJsRuntime.setMemoryLimit(1024 * 1024 * 1024); // メモリ制限 1024MiB (一般的なAtCoderの問題と同じ)
    quickJsRuntime.setMaxStackSize(0); // スタックサイズ制限解除
    const quickJsVm = quickJsRuntime.newContext();
    // ==== core-jsのPolyfillコードをQuickJSのグローバルに評価して、Polyfillを適用する ====
    const coreJsPolyfillResult = quickJsVm.evalCode(coreJsPolyfill, "core-js-polyfill.js");
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

export const run: Runner<"typescript"> = async ({ context, code, stdin }) => {
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
        quickJsVm.setProp(quickJsVm.global, "__stdin__", quickJsVm.newString(stdin));
        // ==== codeを実行 ====
        const preProcessedCode = await preProcessCodeForQuickJS(code);
        const result = quickJsVm.evalCode(preProcessedCode, "Main.js");
        // ==== 実行結果に応じてSuccess/Failureを返す ====
        if (result.error) {
            // ---- エラー発生 -> Failure(RE)を返す ----
            const errorMessage = quickJsVm.dump(result.error);
            return {
                status: "failure",
                details: {
                    kind: "RE",
                    message:
                        typeof errorMessage === "string"
                            ? errorMessage
                            : JSON.stringify(errorMessage),
                },
            };
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
            return {
                status: "success",
                details: {
                    stdout,
                    stderr,
                },
            };
        }
    } catch (error) {
        // ==== なにかあってエラーとなった場合、CE扱いでエラーを返す ====
        return {
            status: "failure",
            details: {
                kind: "CE",
                message: error instanceof Error ? error.message : String(error),
            },
        };
    }
};

// ----------------------------------------------------------------
// export
// ----------------------------------------------------------------
export default { init, run };
