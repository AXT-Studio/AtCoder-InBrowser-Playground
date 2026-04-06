// ================================================================================================
// Runner Module: Python
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { CodeTestContext, Runner } from "../types";
import type { PyodideInterface } from "pyodide";
import { loadPyodide } from "pyodide";

// ----------------------------------------------------------------
// utilities
// ----------------------------------------------------------------

/**
 * サポートするPythonパッケージと、読み込み方法、読み込み先のリスト。
 */
const SUPPORTED_PYTHON_PACKAGES: {
    /** ロード方法 */
    loadMethod: "pyodide_loadPackage" | "micropip_install";
    /** ロード引数(読み込み先) */
    arg: string;
}[] = [
    // bitarray
    { loadMethod: "pyodide_loadPackage", arg: "bitarray" },
    // numpy
    { loadMethod: "pyodide_loadPackage", arg: "numpy" },
    // scipy
    { loadMethod: "pyodide_loadPackage", arg: "scipy" },
    // mpmath
    {
        loadMethod: "micropip_install",
        arg: "https://files.pythonhosted.org/packages/43/e3/7d92a15f894aa0c9c4b49b8ee9ac9850d6e63b03c9c32c0367a13ae62209/mpmath-1.3.0-py3-none-any.whl",
    },
    // sympy
    {
        loadMethod: "micropip_install",
        arg: "https://files.pythonhosted.org/packages/99/ff/c87e0622b1dadea79d2fb0b25ade9ed98954c9033722eb707053d310d4f3/sympy-1.13.3-py3-none-any.whl",
    },
    // networkx
    {
        loadMethod: "micropip_install",
        arg: "https://files.pythonhosted.org/packages/b9/54/dd730b32ea14ea797530a4479b2ed46a6fb250f682a9cfb997e968bf0261/networkx-3.4.2-py3-none-any.whl",
    },
    // sortedcontainers
    {
        loadMethod: "micropip_install",
        arg: "https://files.pythonhosted.org/packages/32/46/9cb0e58b2deb7f82b84065f37f3bffeb12413f947f9388e4cac22c4621ce/sortedcontainers-2.4.0-py2.py3-none-any.whl",
    },
    // ac-library-python
    {
        loadMethod: "micropip_install",
        arg: "ac-library-python",
    },
] as const;

// ----------------------------------------------------------------
// init()
// コード実行に必要な初期化処理を行い、Contextを返す。
// ----------------------------------------------------------------

export const init = async (): Promise<CodeTestContext["python"]> => {
    console.log("Initializing Python runner context...");
    console.log(self.location);
    // ==== Pyodideの初期化 ====
    // console.log(browser.runtime.getURL("/assets/pyodide/" as unknown as never));
    const pyodideIndexURL = new URL("/assets/pyodide/", `${self.location.origin}/`).toString();
    const pyodide = await loadPyodide({
        // 型制約の都合でunknown->neverの順に絞って、実行時は従来どおり同じURLを使う
        indexURL: pyodideIndexURL as unknown as never,
    });
    if (pyodide === null) {
        throw new Error("Failed to initialize Pyodide");
    }
    console.log("Pyodide initialized:", pyodide);
    // ==== サポートするPythonパッケージを先に読み込んでおく ====
    // ---- 先にmicropipだけ読んでおく ----
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    // ---- SUPPORTED_PYTHON_PACKAGESを順に処理していく ----
    for (const { loadMethod, arg } of SUPPORTED_PYTHON_PACKAGES) {
        if (loadMethod === "pyodide_loadPackage") {
            await pyodide.loadPackage(arg);
        } else if (loadMethod === "micropip_install") {
            await micropip.install(arg);
        }
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

export const run: Runner<"python"> = async ({ context, code, stdin }) => {
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
        return {
            status: "success",
            details: {
                stdout: stdoutText,
                stderr: stderrText,
            },
        };
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
