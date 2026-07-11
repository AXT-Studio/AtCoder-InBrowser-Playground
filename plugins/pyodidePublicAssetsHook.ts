// ================================================================================================
// WXT: Pyodide ランタイム資産を public assets として同梱する（stdlib 実行用・phase 1）
// ================================================================================================

import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { ResolvedPublicFile, Wxt } from "wxt";

/** loadPyodide({ indexURL }) が参照する最小セット（パッケージ wheel はまだ同梱しない） */
const PYODIDE_RUNTIME_FILES = [
    "pyodide.mjs",
    "pyodide.asm.mjs",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip",
] as const;

const PYODIDE_PUBLIC_ASSETS_BASE = "assets/pyodide";

export const registerPyodidePublicAssets = (wxt: Wxt, files: ResolvedPublicFile[]): void => {
    const require = createRequire(import.meta.url);
    const pyodidePackageDir = resolve(require.resolve("pyodide/package.json"), "..");

    const existingRelativeDestSet = new Set(files.map((file) => file.relativeDest));
    let added = 0;

    for (const fileName of PYODIDE_RUNTIME_FILES) {
        const relativeDest = `${PYODIDE_PUBLIC_ASSETS_BASE}/${fileName}`;
        if (existingRelativeDestSet.has(relativeDest)) {
            wxt.logger.warn(`AIBP: Skipped duplicate public asset: ${relativeDest}`);
            continue;
        }

        files.push({
            absoluteSrc: resolve(pyodidePackageDir, fileName),
            relativeDest,
        });
        existingRelativeDestSet.add(relativeDest);
        added += 1;
    }

    wxt.logger.info(`AIBP: Added ${added} Pyodide public assets (stdlib runtime).`);
};
