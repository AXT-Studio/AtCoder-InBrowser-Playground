// ================================================================================================
// Runner Module: Python
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { PyodideInterface } from "pyodide";
import { loadPyodide } from "pyodide";
import type { Runner, RunnerResult } from "../types";

// ----------------------------------------------------------------
// types
// ----------------------------------------------------------------

const SUPPORTED_PYTHON_PACKAGES_PYPI = [
    "ac-library-python",
    "numpy",
] as const;
const SUPPORTED_PYTHON_PACKAGES_LOCAL = [
    "scipy",
    "sympy",
    "bitarray",
    "networkx",
    "sortedcontainers",
] as const;

type SupportedPythonPackage =
    | (typeof SUPPORTED_PYTHON_PACKAGES_PYPI)[number]
    | (typeof SUPPORTED_PYTHON_PACKAGES_LOCAL)[number];

/** PythonのRunnerに必要なRunnerContext */
type PythonRunnerContext = {
    pyodide: PyodideInterface;
};

// ----------------------------------------------------------------
// init()
// コード実行に必要な初期化処理を行い、Contextを返す。
// ----------------------------------------------------------------

export const init = async (): Promise<PythonRunnerContext> => {
    // ==== Pyodideの初期化 ====
    const pyodide = await loadPyodide({
        indexURL: browser.runtime.getURL("/assets/pyodide/" as any),
    });
    if (pyodide === null) {
        throw new Error("Failed to initialize Pyodide");
    }
    // ==== サポートするPythonパッケージのインストール ====
    // ---- bitarray, numpy, scipyはローカルにバンドルされたwhlファイルからインストールできる ----
    for (const pkg of SUPPORTED_PYTHON_PACKAGES_LOCAL) {
        await pyodide.loadPackage(pkg);
    }
    // ---- その他のパッケージはPyPIからmicropipを使ってインストールする ----
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    for (const pkg of SUPPORTED_PYTHON_PACKAGES_PYPI) {
        await micropip.install(pkg);
    }
    // ==== Contextを返す ====
    return {
        pyodide,
    };
};

// ----------------------------------------------------------------
// run()
// Contextを用いてコードを実行し、結果を返す。
// ----------------------------------------------------------------

export const run: Runner<PythonRunnerContext> = async (
    { context, code, stdin },
) => {
    // ==== 初手全体try-catch なにかあったらCE扱いでエラー返す ====
    try {
        // ==== contextにpyodideがあることを保証する (型定義上はあるはず) ====
        if (!context.pyodide) {
            throw new Error("Runner context is missing pyodide");
        }
        const { pyodide } = context;
        // ==== stdinHandlerとして、呼ばれるたびに1行ずつstdinから文字列を返す関数を用意する ====
        const stdinLines = stdin.split("\n");
        let stdinIndex = 0;
        const stdinHandler = (): string | undefined => {
            // undefinedはEOF扱いなので、stdinLinesの範囲を超えて呼ばれたときにundefinedになるのは放置してOK
            return stdinLines[stdinIndex++];
        };
        // ==== Pyodideの標準入力を上書きする ====
        pyodide.setStdin({ stdin: stdinHandler });
        // ==== キャプチャのためにstdoutを上書きする (raw handlerを作ってUint8Arrayにできるように保管、あとでテキストにする) ====
        const stdout: number[] = [];
        const stdoutHandler = (charCode: number): void => {
            // charCodeをstdoutに追加する
            stdout.push(charCode);
        };
        pyodide.setStdout({ raw: stdoutHandler });
        // ==== stderrも同様に上書きする ====
        const stderr: number[] = [];
        const stderrHandler = (charCode: number): void => {
            stderr.push(charCode);
        };
        pyodide.setStderr({ raw: stderrHandler });
        // ==== コードを実行する ====
        await pyodide.runPythonAsync(code);
        // ==== 実行が成功した場合、stdoutとstderrをUint8Array→テキストと変換して返す ====
        const decoder = new TextDecoder();
        const stdoutText = decoder.decode(new Uint8Array(stdout));
        const stderrText = decoder.decode(new Uint8Array(stderr));
        const result: Awaited<RunnerResult> = {
            status: "success",
            data: {
                stdout: stdoutText,
                stderr: stderrText,
            },
        };
        return result;
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
