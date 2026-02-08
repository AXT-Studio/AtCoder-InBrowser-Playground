// ================================================================================================
// entrypoints/background/workers/typescript.ts
// Runner Worker: TypeScript
// ================================================================================================
// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import { transform as babelTransform } from "@babel/standalone";
import variant from "@jitl/quickjs-singlefile-browser-release-sync";
import util from "node-inspect-extracted";
import type { QuickJSContext, QuickJSWASMModule } from "quickjs-emscripten-core";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";

// ----------------------------------------------------------------
// JavaScriptオブジェクトを標準出力風の文字列に変換する関数
// (node-inspect-extractedを利用)
// ----------------------------------------------------------------

const dumpObject = (value: any): string => {
    if (typeof value === "string") {
        return value;
    }
    if (typeof util.inspect === "function") {
        return util.inspect(value, { depth: null });
    }
    return String(value);
};

// ----------------------------------------------------------------
// JavaScriptを実行するためのQuickJSの初期化
// ----------------------------------------------------------------

let quickJS: QuickJSWASMModule | null = null;
let vm: QuickJSContext | null = null;

const initialize = async () => {
    try {
        quickJS = await newQuickJSWASMModuleFromVariant(variant);
        vm = quickJS.newContext();

        console.log("TypeScript worker starting...");

        self.postMessage({
            type: "worker-ready",
            payload: {
                language: "typescript",
            },
        });
    } catch (error) {
        console.error("Failed to initialize QuickJS:", error);
        self.postMessage({
            type: "worker-error",
            payload: {
                error: `Failed to initialize QuickJS: ${(error as Error).message}`,
            },
        });
    }
};

initialize();

// ----------------------------------------------------------------
// TypeScriptコードをJavaScript (ES2020相当)に変換する (Babelを利用)
// ----------------------------------------------------------------

const babel = (code: string): string | null => {
    try {
        const result = babelTransform(code, {
            presets: ["typescript", ["env", { targets: { esmodules: true }, modules: false }]],
            filename: "Main.ts",
        });
        return result?.code || null;
    } catch (error) {
        console.error("Babel transformation error:", error);
        throw error;
    }
};

// ----------------------------------------------------------------
// ユーザーコードをQuickJSで実行できる形に変換する
// ----------------------------------------------------------------

const preprocessCode = (code: string): string => {
    // ==== Main呼び出しについて、Main(__stdin__)に置き換える ====
    const patterns = [
        // Node.js: Main(require("fs").readFileSync("/dev/stdin", "utf8"));
        /Main\s*\(\s*require\s*\(\s*['"]fs['"]\s*\)\.readFileSync\s*\(\s*['"]\/dev\/stdin['"]\s*,\s*['"]utf8['"]\s*\)\s*\);?/g,
        // Deno: Main(await Deno.readTextFile("/dev/stdin"));
        /Main\s*\(\s*await\s+Deno\.readTextFile\s*\(\s*['"]\/dev\/stdin['"]\s*\)\s*\);?/g,
        // Bun: Main(await Bun.file("/dev/stdin").text());
        /Main\s*\(\s*await\s+Bun\.file\s*\(\s*['"]\/dev\/stdin['"]\s*\)\.text\s*\(\s*\)\s*\);?/g,
    ];
    let modifiedCode = code;
    for (const pattern of patterns) {
        modifiedCode = modifiedCode.replace(pattern, "Main(__stdin__)");
    }
    // ==== Babelに通す ====
    let transformedCode = babel(modifiedCode);
    if (transformedCode === null) {
        throw new Error("Babel transformation returned null");
    }

    // ==== QuickJSはTop-Level exportをサポートしてないかも 念の為削除 ====
    transformedCode = transformedCode.replace(/^export\s*\{\s*\}\s*;?/m, "");
    transformedCode = transformedCode.replace(/^export\s+/gm, "");
    // ==== 全体をIIFEで包む (グローバル汚染防止 & 2回目以降の実行での再宣言扱いを回避) ====
    transformedCode = `(function() {\n${transformedCode}\n})();`;
    // ==== 変換後のコードを返す ====
    return transformedCode;
};

// ----------------------------------------------------------------
// コードを実行し、stdout, stderr, exitCodeを返す関数
// ----------------------------------------------------------------

const runCode = (code: string, stdin: string): { stdout: string; stderr: string; exitCode: number } => {
    if (vm === null) {
        throw new Error("QuickJS VM is not initialized");
    }
    console.log("[Worker] runner: Executing code...");
    // ==== stdout, stderrのキャプチャのために配列を用意し、console.logとconsole.errorをオーバーライド ====
    const stdoutArray: any[] = [];
    const stderrArray: any[] = [];
    const logFn = vm.newFunction("log", (...args: any[]) => {
        args.forEach((arg) => {
            if (!vm) return;
            stdoutArray.push(vm.dump(arg));
        });
    });
    const errorFn = vm.newFunction("error", (...args: any[]) => {
        args.forEach((arg) => {
            if (!vm) return;
            stderrArray.push(vm.dump(arg));
        });
    });
    const consoleObj = vm.newObject();
    vm.setProp(consoleObj, "log", logFn);
    vm.setProp(consoleObj, "error", errorFn);
    vm.setProp(vm.global, "console", consoleObj);
    // stdinをグローバル変数__stdin__にセット
    vm.setProp(vm.global, "__stdin__", vm.newString(stdin));
    // ==== codeを実行 ====
    const preprocessedCode = preprocessCode(code);
    const result = vm.evalCode(preprocessedCode, "Main.ts");
    // ==== 実行結果の取得 ====
    if (result.error) {
        console.log("[Worker] runner: Execution error");
        // エラー発生 -> stderrにエラーメッセージをセットしてexitCodeを1にする
        const errorVal = vm.dump(result.error);
        const stderr = dumpObject(errorVal);
        // キャプチャしたstdoutも結合して返す
        const stdout = stdoutArray.map(dumpObject).join("\n");
        // リソース解放
        logFn.dispose();
        errorFn.dispose();
        consoleObj.dispose();
        result.error.dispose();
        // 戻す
        return {
            stdout: stdout,
            stderr: stderr,
            exitCode: 1,
        };
    } else {
        console.log("[Worker] runner: Execution succeeded");
        // 正常終了 -> キャプチャしたstdout, stderrを結合して返す
        const stdout = stdoutArray.map(dumpObject).join("\n");
        const stderr = stderrArray.map(dumpObject).join("\n");
        // リソース解放
        logFn.dispose();
        errorFn.dispose();
        consoleObj.dispose();
        result.value.dispose();
        // 戻す
        return {
            stdout: stdout,
            stderr: stderr,
            exitCode: 0,
        };
    }
};

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
            const { stdout, stderr, exitCode } = runCode(code, stdin);
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