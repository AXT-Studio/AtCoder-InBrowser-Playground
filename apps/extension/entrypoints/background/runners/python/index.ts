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

const SUPPORTED_PYTHON_PACKAGES = [
    "bitarray",
    "more-itertools",
    "networkx",
    "numpy",
    "scipy",
    "sortedcontainers",
    "sympy",
    "ac-library-python",
] as const;

type SupportedPythonPackage = (typeof SUPPORTED_PYTHON_PACKAGES)[number];

/** PythonのRunnerに必要なRunnerContext */
type PythonRunnerContext = {
    pyodide: PyodideInterface | null;
    pyodideIndexURL: string;
    supportedPackages: readonly SupportedPythonPackage[];
};

// ----------------------------------------------------------------
// init()
// コード実行に必要な初期化処理を行い、Contextを返す。
// ----------------------------------------------------------------

export const init = (): PythonRunnerContext => {
    return {
        pyodide: null,
        pyodideIndexURL: "/assets/pyodide/",
        supportedPackages: SUPPORTED_PYTHON_PACKAGES,
    };
};

// ----------------------------------------------------------------
// run()
// Contextを用いてコードを実行し、結果を返す。
// ----------------------------------------------------------------

export const run: Runner<PythonRunnerContext> = async ({ code }) => {
    const result: Awaited<RunnerResult> = {
        status: "success",
        data: {
            stdout: code,
            stderr: "",
        },
    };
    return result;
};

// ----------------------------------------------------------------
// export
// ----------------------------------------------------------------
export default { init, run };
