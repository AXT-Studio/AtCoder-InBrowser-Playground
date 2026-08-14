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
import { formatRuntimeError, formatTransformError } from "./formatError";

const STDIN_PATTERNS = [
    `require("fs").readFileSync("/dev/stdin", "utf8")`,
    `await Deno.readTextFile("/dev/stdin")`,
    `await Bun.file("/dev/stdin").text()`,
];

// ----------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------

type PreprocessResult = {
    code: string;
    map: string | undefined;
};

/**
 * TS/JSコードを受け取り、そのコードをES2023相当までダウンコンパイルします (esbuild-wasmを使用)
 * @param code ユーザーが書いたコード（stdin 置換前）
 */
const downCompileCode = async (code: string): Promise<PreprocessResult> => {
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
    const result = await esbuildTransform(code, {
        loader: "ts",
        target: "es2023",
        sourcemap: true,
        sourcefile: "Main.js",
    });
    if (result === null || typeof result.code !== "string") {
        throw new Error("esbuild transformation failed");
    }
    return {
        code: result.code,
        map: typeof result.map === "string" && result.map.length > 0 ? result.map : undefined,
    };
};

/**
 * コードをQuickJSで実行するときに満たしてほしい形に変換します。
 * esbuild（sourcemap 付き）→ export 除去 → stdin 置換。IIFE では包みません（実行ごとに Worker を捨てるため）。
 */
const preProcessCodeForQuickJS = async (code: string): Promise<PreprocessResult> => {
    const compiled = await downCompileCode(code);
    // QuickJSはTop-Level exportをサポートしてないかも 念の為削除（改行は残して行番号をずらさない）
    let result = compiled.code;
    result = result.replace(/^export\s*\{\s*\}\s*;?/m, "");
    result = result.replace(/^export\s+/gm, "");
    // テスト実行環境ではグローバル変数`__stdin__`に標準入力を入れておくので、これらの文字列を全て`(__stdin__)`に置き換える。
    for (const pattern of STDIN_PATTERNS) {
        result = result.replaceAll(pattern, "(__stdin__)");
    }
    return { code: result, map: compiled.map };
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
            const preprocessed = await preProcessCodeForQuickJS(code);
            // 変換後のコードを実行
            const result = quickJsVm.evalCode(preprocessed.code, "Main.js");
            // 実行結果に応じて、適切な結果を返す
            if (result.error) {
                // エラー発生時はRE扱い
                const dumped = quickJsVm.dump(result.error);
                result.error.dispose();
                return {
                    status: "RE",
                    stdout: "",
                    stderr: formatRuntimeError(dumped, preprocessed.map),
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
                stderr: formatTransformError(error),
            };
        }
    },
};
