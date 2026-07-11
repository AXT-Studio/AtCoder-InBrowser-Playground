// ================================================================================================
// Language Module - TypeScript (also JavaScript supports)
// ================================================================================================

import type { LanguageModule } from "../../types";
import { initialize as esbuildInitialize, transform as esbuildTransform } from "esbuild-wasm";
import esbuildWasmURL from "esbuild-wasm/esbuild.wasm?url&no-inline";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import type { QuickJSContext } from "quickjs-emscripten-core";
import quickJSVariant from "@jitl/quickjs-singlefile-browser-release-sync";
import inspectRuntime from "virtual:inspect-runtime";
import coreJsPolyfill from "virtual:corejs-polyfill";

// ----------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------

/**
 * TS/JSコードを受け取り、そのコードをES2023相当までダウンコンパイルします (esbuild-wasmを使用)
 * @param code コード
 * @returns ダウンコンパイル後のコード
 */
const downCompileCode = async (code: string): Promise<string> => {
    // esbuild-wasmの初期化 (初回のみ)
    // 2回目以降はエラーが出るので、try-catchで捻り潰す
    try {
        await esbuildInitialize({
            wasmURL: esbuildWasmURL,
            worker: false, // このコード自体がメインから分離されているのでworkerは使用しない というかworker使えない
        });
    } catch {
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

/**
 * コードをQuickJSで実行するときに満たしてほしい形に変換します。
 * @param code コード
 * @returns QuickJSで実行するときに満たしてほしい形のコード
 */
const preProcessCodeForQuickJS = async (code: string): Promise<string> => {
    // 以下の3パターンのいずれかにマッチするコードは、標準入力をすべて受け取るコードとみなす。
    // 1. Node.js向け: `require("fs").readFileSync("/dev/stdin", "utf8")`
    // 2. Deno向け: `await Deno.readTextFile("/dev/stdin")`
    // 3. Bun向け: `await Bun.file("/dev/stdin").text()`
    // テスト実行環境ではグローバル変数`__stdin__`に標準入力を入れておくので、これらの文字列を全て`(__stdin__)`に置き換える。
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
    // ダウンコンパイルに通す
    result = await downCompileCode(result);
    // QuickJSはTop-Level exportをサポートしてないかも 念の為削除
    result = result.replace(/^export\s*\{\s*\}\s*;?/m, "");
    result = result.replace(/^export\s+/gm, "");
    // 全体をIIFEで包む (一応グローバル汚染防止として)
    result = `(function() {\n${result}\n})();`;
    // 変換後のコードを返す
    return result;
};

/**
 * QuickJS グローバル上の変数が string[] であると仮定して、dumpしてきて、それを改行区切り文字列に変換します。
 * @param quickJsVm QuickJS VM
 * @param propName 変数名
 * @returns 改行区切り文字列
 */
const dumpJoinedLines = (quickJsVm: QuickJSContext, propName: "__stdout__" | "__stderr__"): string => {
    const arrayHandle = quickJsVm.getProp(quickJsVm.global, propName);
    const dumped = quickJsVm.dump(arrayHandle);
    arrayHandle.dispose();
    if (!Array.isArray(dumped)) {
        return "";
    }
    return dumped.map(String).join("\n");
};

// ----------------------------------------------------------------
// Language Module
// ----------------------------------------------------------------

/** Language Context: 実行時に必要なコンテキスト */
export type LanguageContext = {
    quickJsVm: QuickJSContext;
};

/** Module */
export const typescript: LanguageModule<LanguageContext> = {
    async init() {
        // ==== QuickJSの初期化 ====
        const quickJs = await newQuickJSWASMModuleFromVariant(quickJSVariant);
        const quickJsRuntime = quickJs.newRuntime();
        quickJsRuntime.setMemoryLimit(1024 * 1024 * 1024); // メモリ制限 1024MiB (一般的なAtCoderの問題と同じ)
        quickJsRuntime.setMaxStackSize(0); // スタックサイズ制限解除
        const quickJsVm = quickJsRuntime.newContext();
        // core-jsのPolyfillコードをQuickJSのグローバルに評価して、Polyfillを適用する
        const coreJsPolyfillResult = quickJsVm.evalCode(coreJsPolyfill, "core-js-polyfill.js");
        if (coreJsPolyfillResult.error) {
            throw new Error("Failed to apply core-js polyfill");
        }
        // object-inspect + consoleShim を QuickJS に注入
        const inspectRuntimeResult = quickJsVm.evalCode(inspectRuntime, "inspect-runtime.js");
        if (inspectRuntimeResult.error) {
            throw new Error("Failed to inject inspect-runtime");
        }
        // ==== Contextを返す ====
        return {
            quickJsVm,
        };
    },
    async run(ctx, code, stdin) {
        // 初手全体try-catch 何かあったらCEを返せるように
        try {
            // ctxにquickJSがあるので、一旦それを持ってくる
            const quickJsVm = ctx.quickJsVm;
            // consoleShimの初期化を行う (inspecRuntimeでそういうコードが注入されている)
            const consoleShimResult = quickJsVm.evalCode("__aibpSetupConsole();", "setup-console.js");
            if (consoleShimResult.error) {
                throw new Error("Failed to initialize consoleShim");
            }
            // グローバル変数 __stdin__ に、こっちが持っている stdin を入れる
            quickJsVm.setProp(quickJsVm.global, "__stdin__", quickJsVm.newString(stdin));
            // コードをQuickJSで実行するときに満たしてほしい形に変換
            const preProcessedCode = await preProcessCodeForQuickJS(code);
            // 変換後のコードを実行
            const result = quickJsVm.evalCode(preProcessedCode, "Main.js");
            // 実行結果に応じて、適切な結果を返す
            if (result.error) {
                // エラー発生時はRE扱い
                const dumped = quickJsVm.dump(result.error);
                result.error.dispose();
                const errorMessage = typeof dumped === "string" ? dumped : JSON.stringify(dumped);
                return {
                    status: "RE",
                    stdout: "",
                    stderr: errorMessage,
                };
            } else {
                // 正常終了時はcompleted扱い
                return {
                    status: "completed",
                    stdout: dumpJoinedLines(quickJsVm, "__stdout__"),
                    stderr: dumpJoinedLines(quickJsVm, "__stderr__"),
                };
            }
        } catch (error) {
            // なにかあってエラーとなった場合、CE扱いでエラーを返す
            return {
                status: "CE",
                stdout: "",
                stderr: error instanceof Error ? error.message : String(error),
            };
        }
    },
};
