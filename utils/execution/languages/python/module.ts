// ================================================================================================
// Language Module - Python (Pyodide, stdlib only for now)
// ================================================================================================

import { loadPyodide, type PyodideInterface } from "pyodide";
import type { LanguageModule } from "../../types";

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
        error !== null && typeof error === "object" && "type" in error
            ? String((error as { type: unknown }).type)
            : "";
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

        const stdinLines = stdin.split("\n");
        let stdinIndex = 0;
        pyodide.setStdin({
            stdin: () => stdinLines[stdinIndex++],
        });

        const stdoutBytes: number[] = [];
        const stderrBytes: number[] = [];
        pyodide.setStdout({ raw: (charCode) => stdoutBytes.push(charCode) });
        pyodide.setStderr({ raw: (charCode) => stderrBytes.push(charCode) });

        try {
            await pyodide.runPythonAsync(code);
            return {
                status: "completed",
                stdout: decodeRawStream(stdoutBytes),
                stderr: decodeRawStream(stderrBytes),
            };
        } catch (error) {
            const status = classifyPythonError(error);
            return {
                status,
                stdout: decodeRawStream(stdoutBytes),
                stderr: formatErrorMessage(error),
            };
        }
    },
};
