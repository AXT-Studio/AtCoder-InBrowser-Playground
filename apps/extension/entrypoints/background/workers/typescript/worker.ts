// ================================================================================================
// Runner Worker: TypeScript (JavaScriptも対応)
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
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import type { Failure, Result, Success } from "./../../../../types/Result";

// ----------------------------------------------------------------
// esbuild-wasmの事前ロード
// ----------------------------------------------------------------

console.log(coreJsPolyfill); // core-jsのPolyfillコードを事前にビルドしておいて、esbuildの初期化前にログ出力してみる (これも結構時間かかるはず)

await esbuildInitialize({
    wasmURL: esbuildWasmURL,
    worker: false, // 既にこのコード自体がWorker内で動いているため、esbuildのWorkerは使用しない
});

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
// ## Worker Initialization Protocol
// 起動
// -> コードを渡されたらすぐ実行できるよう事前準備を行う
// -> notify-initializedを送る
// ----------------------------------------------------------------

// ==== QuickJSの初期化 ====
const quickJS = await newQuickJSWASMModuleFromVariant(quickJSVariant);
const vm = quickJS.newContext();

// ==== core-jsのPolyfillコードをQuickJSのグローバルに評価して、Polyfillを適用する ====
const coreJsPolyfillResult = vm.evalCode(coreJsPolyfill, "core-js-polyfill.js");
if (coreJsPolyfillResult.error) {
    console.error(
        "Failed to apply core-js polyfill:",
        vm.dump(coreJsPolyfillResult.error),
    );
    throw new Error("Failed to apply core-js polyfill");
}

// ==== Workerの準備ができたことを通知 ====
self.postMessage({
    type: "notify-initialized",
    payload: {
        id: crypto.randomUUID(),
        language: "typescript",
    },
});

// ----------------------------------------------------------------
// ## Worker Run Protocol
// request-runを受け取る
// -> コードを実行する
// -> notify-outputを送る
// ----------------------------------------------------------------

type NotifyOutputPayloadResult = Result<
    { stdout: string; stderr: string },
    { errorType: "TLE" | "RE" | "CE"; error: string }
>;

self.addEventListener("message", async (event) => {
    const message = event.data;
    if (message.type === "request-run") {
        const { id, code, stdin } = message.payload;
        // 一応全体をtry-catchしておこうか……
        try {
            console.log(
                `[Worker] Received request-run: id=${id}, code=${
                    code.slice(
                        0,
                        100,
                    )
                }..., stdin=${stdin.slice(0, 100)}...`,
            );
            if (!vm) {
                // ==== もしvmが存在しなかったらエラーを返す (通常は起こらないはず) ====
                const result: NotifyOutputPayloadResult = {
                    status: "failure",
                    error: {
                        errorType: "RE",
                        error: "VM initialization failed",
                    },
                };
                self.postMessage({
                    type: "notify-output",
                    payload: {
                        id,
                        result,
                    },
                });
                return;
            }
            // ==== stdout, stderrのキャプチャのために配列を用意 ====
            const stdoutArray: unknown[][] = [];
            const stderrArray: unknown[][] = [];
            // ==== console.logとconsole.errorをオーバーライドして、stdout/stderrArrayに投げ込むようにする ====
            const logFn = vm.newFunction("log", (...args: any[]) => {
                stdoutArray.push(
                    args.map((arg) => {
                        if (!vm) return "";
                        return vm.dump(arg);
                    }),
                );
            });
            const errorFn = vm.newFunction("error", (...args: any[]) => {
                stderrArray.push(
                    args.map((arg) => {
                        if (!vm) return "";
                        return vm.dump(arg);
                    }),
                );
            });
            const consoleObj = vm.newObject();
            vm.setProp(consoleObj, "log", logFn);
            vm.setProp(consoleObj, "error", errorFn);
            vm.setProp(vm.global, "console", consoleObj);
            // ==== stdinをグローバル変数__stdin__にセット ====
            vm.setProp(vm.global, "__stdin__", vm.newString(stdin));
            // ==== codeを実行 ====
            const preProcessedCode = await preProcessCodeForQuickJS(code);
            const result = vm.evalCode(preProcessedCode, "Main.ts");
            if (result.error) {
                // ==== 実行結果の取得 ====
                // エラー発生 -> Failureを返す
                const error = vm.dump(result.error);
                const notifyResult: NotifyOutputPayloadResult = {
                    status: "failure",
                    error: {
                        errorType: "RE",
                        error: typeof error === "string"
                            ? error
                            : JSON.stringify(error),
                    },
                };
                self.postMessage({
                    type: "notify-output",
                    payload: {
                        id,
                        result: notifyResult,
                    },
                });
            } else {
                // 正常終了 -> Successを返す
                const stdout = stdoutArray
                    .map((args) => args.map(stringifyJSObject).join(" "))
                    .join("\n");
                const stderr = stderrArray
                    .map((args) => args.map(stringifyJSObject).join(" "))
                    .join("\n");
                const notifyResult: NotifyOutputPayloadResult = {
                    status: "success",
                    data: {
                        stdout,
                        stderr,
                    },
                };
                self.postMessage({
                    type: "notify-output",
                    payload: {
                        id,
                        result: notifyResult,
                    },
                });
            }
        } catch (error) {
            // ==== 予期せぬエラーが発生した場合もFailureを返す (例外の内容はREとして返す) ====
            const ErrorDetails = (() => {
                if (error instanceof Error) {
                    return error.message;
                } else if (typeof error === "string") {
                    return error;
                } else {
                    return JSON.stringify(error);
                }
            })();
            const notifyResult: NotifyOutputPayloadResult = {
                status: "failure",
                error: {
                    errorType: "RE",
                    error: ErrorDetails,
                },
            };
            self.postMessage({
                type: "notify-output",
                payload: {
                    id,
                    result: notifyResult,
                },
            });
        }
    }
});
