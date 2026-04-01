// ================================================================================================
// Runner Module: Python (Firefox ver.)
// FirefoxではBackground Script内でPyodideが動かせるので、そうします
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { PyodideInterface } from "pyodide";
import { loadPyodide } from "pyodide";
import type { Runner, RunnerResult } from "../types";
import type { PythonRunnerContext } from "./protocol";

// ----------------------------------------------------------------
// types
// ----------------------------------------------------------------

const SUPPORTED_PYTHON_PACKAGES_PYPI = [
    "ac-library-python",
    "mpmath",
    "sympy",
    "networkx",
    "sortedcontainers",
] as const;
const SUPPORTED_PYTHON_PACKAGES_LOCAL = [
    "numpy",
    "scipy",
    "bitarray",
] as const;

// ---- lock優先を避けるため、pure Pythonパッケージはwheel URLを固定してインストールする ----
const PYPI_WHEEL_URL_BY_PACKAGE = {
    mpmath:
        "https://files.pythonhosted.org/packages/43/e3/7d92a15f894aa0c9c4b49b8ee9ac9850d6e63b03c9c32c0367a13ae62209/mpmath-1.3.0-py3-none-any.whl",
    sympy:
        "https://files.pythonhosted.org/packages/99/ff/c87e0622b1dadea79d2fb0b25ade9ed98954c9033722eb707053d310d4f3/sympy-1.13.3-py3-none-any.whl",
    networkx:
        "https://files.pythonhosted.org/packages/b9/54/dd730b32ea14ea797530a4479b2ed46a6fb250f682a9cfb997e968bf0261/networkx-3.4.2-py3-none-any.whl",
    sortedcontainers:
        "https://files.pythonhosted.org/packages/32/46/9cb0e58b2deb7f82b84065f37f3bffeb12413f947f9388e4cac22c4621ce/sortedcontainers-2.4.0-py2.py3-none-any.whl",
} as const;

// ----------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------

/** (Firefox限定) PyodideのInterfaceを保存するMap */
const pyodideMap = new Map<string, PyodideInterface>();

// ----------------------------------------------------------------
// init()
// コード実行に必要な初期化処理を行い、Contextを返す。
// ----------------------------------------------------------------

export const init = async (): Promise<PythonRunnerContext> => {
    // ==== Pyodideの初期化 ====
    const pyodide = await loadPyodide({
        // 型制約の都合でunknown->neverの順に絞って、実行時は従来どおり同じURLを使う
        indexURL: browser.runtime.getURL(
            "/assets/pyodide/" as unknown as never,
        ),
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
        // ---- pure Pythonの一部パッケージはwheel URL固定でinstallし、lock優先を回避する ----
        const wheelUrl = PYPI_WHEEL_URL_BY_PACKAGE[
            pkg as keyof typeof PYPI_WHEEL_URL_BY_PACKAGE
        ];
        try {
            await micropip.install(wheelUrl ?? pkg);
        } catch (error) {
            throw new Error(
                `Failed to install Python package ${pkg}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }
    // ==== Contextを保存してIDを返す ====
    const pyodideInterfaceID = crypto.randomUUID();
    pyodideMap.set(pyodideInterfaceID, pyodide);
    return {
        pyodideInterfaceID,
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
        // ==== contextで指定されたIDのpyodideがあることを保証する (型定義上はあるはず) ====
        const pyodide = pyodideMap.get(context.pyodideInterfaceID);
        if (!pyodide) {
            throw new Error("Runner context is missing pyodide");
        }
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
