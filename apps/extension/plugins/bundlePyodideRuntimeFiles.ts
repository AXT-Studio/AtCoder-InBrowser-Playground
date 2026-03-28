// ================================================================================================
// Vite plugin to bundle required Pyodide runtime files into extension assets.
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ----------------------------------------------------------------
// constants
// ----------------------------------------------------------------

const PYODIDE_RUNTIME_FILES = [
    "pyodide.js",
    "pyodide.mjs",
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip",
] as const;

type BuildPlugin = {
    name: string;
    apply: "build";
    generateBundle(this: {
        emitFile(
            file: { type: "asset"; fileName: string; source: Uint8Array },
        ): void;
    }): Promise<void>;
};

// ----------------------------------------------------------------
// implementation
// ----------------------------------------------------------------

export default function bundlePyodideRuntimeFilesPlugin(): BuildPlugin {
    return {
        name: "aibp-bundle-pyodide-runtime-files",
        apply: "build",
        async generateBundle() {
            const extensionRootDir = resolve(
                fileURLToPath(new URL("..", import.meta.url)),
            );
            const pyodidePackageDir = resolve(
                extensionRootDir,
                "node_modules",
                "pyodide",
            );

            for (const fileName of PYODIDE_RUNTIME_FILES) {
                const sourceFilePath = resolve(pyodidePackageDir, fileName);
                let source: Uint8Array;
                try {
                    source = await readFile(sourceFilePath);
                } catch (error) {
                    throw new Error(
                        `AIBP: Failed to read Pyodide runtime file: ${sourceFilePath} (${
                            error instanceof Error
                                ? error.message
                                : String(error)
                        })`,
                    );
                }

                this.emitFile({
                    type: "asset",
                    fileName: `assets/pyodide/${fileName}`,
                    source,
                });
            }
        },
    };
}
