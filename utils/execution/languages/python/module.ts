// ================================================================================================
// Language Module - Python (Pyodide + micropip allowlist)
// ================================================================================================

import { loadPyodide, type PyodideInterface } from "pyodide";
import type { LanguageModule } from "../../types";
import { ensureAllowlistedPackages } from "./packages";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * 拡張 Worker では同梱 assets を指す。
 * Vitest / Node では indexURL を省略し、pyodide パッケージ自身の解決に任せる。
 */
const resolvePyodideIndexURL = (): string | undefined => {
    if (typeof self === "undefined" || !self.location) {
        return undefined;
    }
    const { protocol, origin } = self.location;
    if (protocol === "chrome-extension:" || protocol === "moz-extension:") {
        return new URL("/assets/pyodide/", `${origin}/`).toString();
    }
    return undefined;
};

const decodeRawStream = (bytes: number[]): string => {
    if (bytes.length === 0) {
        return "";
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
};

/** Syntax / Indentation / TabError → CE、それ以外の PythonError → RE */
const classifyPythonError = (error: unknown): "CE" | "RE" => {
    const type =
        error !== null && typeof error === "object" && "type" in error ? String((error as { type: unknown }).type) : "";
    if (type === "SyntaxError" || type === "IndentationError" || type === "TabError") {
        return "CE";
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/\b(SyntaxError|IndentationError|TabError)\b/.test(message)) {
        return "CE";
    }
    return "RE";
};

const formatErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};

/** ユーザーソースを Pyodide globals 経由で渡す。名前はユーザーコードと衝突しにくいものにする */
const USER_SOURCE_GLOBAL = "__aibp_user_source";

const EXIT_CODE_GLOBAL = "__aibp_exit_code";

/**
 * `sys.exit()` / `exit()` / `quit()` は SystemExit なので、eval の外へ漏らさない。
 * 終了コードは CPython に合わせ、None/0 を成功、それ以外を失敗として JS へ返す。
 * `runPythonAsync` と同じ `eval_code_async` を使い、ファイル名 `<exec>` と top-level await を維持する。
 */
const RUN_USER_CODE = `\
from _pyodide._base import eval_code_async as __aibp_eval_code_async
${EXIT_CODE_GLOBAL} = 0
try:
    await __aibp_eval_code_async(${USER_SOURCE_GLOBAL}, globals())
except SystemExit as __aibp_e:
    __aibp_code = __aibp_e.code
    if __aibp_code is None:
        ${EXIT_CODE_GLOBAL} = 0
    elif isinstance(__aibp_code, int):
        ${EXIT_CODE_GLOBAL} = int(__aibp_code)
    else:
        print(__aibp_code, file=__import__("sys").stderr)
        ${EXIT_CODE_GLOBAL} = 1
finally:
    globals().pop(${JSON.stringify(USER_SOURCE_GLOBAL)}, None)
    globals().pop("__aibp_eval_code_async", None)
    globals().pop("__aibp_e", None)
    globals().pop("__aibp_code", None)
`;

const readExitCode = (pyodide: PyodideInterface): number => {
    const value = pyodide.globals.get(EXIT_CODE_GLOBAL);
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const clearRunGlobals = (pyodide: PyodideInterface): void => {
    pyodide.runPython(`
globals().pop(${JSON.stringify(USER_SOURCE_GLOBAL)}, None)
globals().pop(${JSON.stringify(EXIT_CODE_GLOBAL)}, None)
None
`);
};

// ----------------------------------------------------------------
// Language Module
// ----------------------------------------------------------------

export type LanguageContext = {
    pyodide: PyodideInterface;
};

export const python: LanguageModule<LanguageContext> = {
    async init() {
        const indexURL = resolvePyodideIndexURL();
        const pyodide = await loadPyodide(indexURL ? { indexURL } : undefined);
        return { pyodide };
    },

    async run(ctx, code, stdin) {
        const { pyodide } = ctx;

        // loadPackage / micropip の進捗メッセージをユーザー stdout に混ぜない
        try {
            pyodide.setStdout({ batched: () => {} });
            pyodide.setStderr({ batched: () => {} });
            await ensureAllowlistedPackages(pyodide, code);
        } catch (error) {
            return {
                status: "CE",
                stdout: "",
                stderr: formatErrorMessage(error),
            };
        }

        const stdinLines = stdin.split("\n");
        let stdinIndex = 0;
        pyodide.setStdin({
            stdin: () => stdinLines[stdinIndex++],
        });

        const stdoutBytes: number[] = [];
        const stderrBytes: number[] = [];
        pyodide.setStdout({ raw: (charCode) => stdoutBytes.push(charCode) });
        pyodide.setStderr({ raw: (charCode) => stderrBytes.push(charCode) });

        pyodide.globals.set(USER_SOURCE_GLOBAL, code);
        try {
            await pyodide.runPythonAsync(RUN_USER_CODE);
            const exitCode = readExitCode(pyodide);
            const stdout = decodeRawStream(stdoutBytes);
            const stderr = decodeRawStream(stderrBytes);
            if (exitCode !== 0) {
                return {
                    status: "RE",
                    stdout,
                    stderr: stderr || `exit ${exitCode}`,
                };
            }
            return { status: "completed", stdout, stderr };
        } catch (error) {
            const status = classifyPythonError(error);
            return {
                status,
                stdout: decodeRawStream(stdoutBytes),
                stderr: formatErrorMessage(error),
            };
        } finally {
            clearRunGlobals(pyodide);
        }
    },
};
