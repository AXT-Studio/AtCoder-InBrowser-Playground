// ================================================================================================
// Runner Module: TypeScript
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { CodeTestContext, Runner } from "../types";

import { initialize as esbuildInitialize, transform as esbuildTransform } from "esbuild-wasm";
import esbuildWasmURL from "esbuild-wasm/esbuild.wasm?url&no-inline";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import type { QuickJSContext } from "quickjs-emscripten-core";
import quickJSVariant from "@jitl/quickjs-singlefile-browser-release-sync";
import coreJsPolyfill from "virtual:corejs-polyfill";
import inspectRuntime from "virtual:inspect-runtime";

// ----------------------------------------------------------------
// utilities
// ----------------------------------------------------------------

/** QuickJS グローバル上の string[] を dump して改行区切り文字列に変換します */
const dumpJoinedLines = (
    quickJsVm: QuickJSContext,
    propName: "__stdout__" | "__stderr__",
): string => {
    const arrayHandle = quickJsVm.getProp(quickJsVm.global, propName);
    const dumped = quickJsVm.dump(arrayHandle);
    arrayHandle.dispose();
    if (!Array.isArray(dumped)) {
        return "";
    }
    return dumped.map(String).join("\n");
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
    // ==== object-inspect + console formatter を QuickJS に注入 ====
    const inspectRuntimeResult = quickJsVm.evalCode(inspectRuntime, "inspect-runtime.js");
    if (inspectRuntimeResult.error) {
        console.error(
            "Failed to apply inspect runtime:",
            quickJsVm.dump(inspectRuntimeResult.error),
        );
        throw new Error("Failed to apply inspect runtime");
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
        // ==== __stdout__/__stderr__ をリセットし console を再設定 ====
        const setupResult = quickJsVm.evalCode("__aibpSetupConsole();", "setup-console.js");
        if (setupResult.error) {
            const setupError = quickJsVm.dump(setupResult.error);
            return {
                status: "failure",
                details: {
                    kind: "CE",
                    message:
                        typeof setupError === "string"
                            ? setupError
                            : JSON.stringify(setupError),
                },
            };
        }
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
            const stdout = dumpJoinedLines(quickJsVm, "__stdout__");
            const stderr = dumpJoinedLines(quickJsVm, "__stderr__");
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
