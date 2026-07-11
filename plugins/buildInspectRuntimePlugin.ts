// ================================================================================================
// object-inspect + consoleShim を QuickJS 向け IIFE 文字列としてビルドする Vite Virtual Plugin
// (生成したコードは TypeScript Language Module 内で QuickJS に eval する)
// ================================================================================================

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const require = createRequire(import.meta.url);
const pluginDir = dirname(fileURLToPath(import.meta.url));
const consoleShimPath = join(
    pluginDir,
    "../utils/execution/languages/typescript/consoleShim.js",
);

export const buildInspectRuntimePlugin = () => {
    const VIRTUAL_ID = "virtual:inspect-runtime";
    const resolvedVirtualModuleId = `\0${VIRTUAL_ID}`;
    let inspectRuntimeCode = "";

    return {
        name: "inspect-runtime",
        async buildStart() {
            const objectInspectEntry = require.resolve("object-inspect");
            const bundleResult = await esbuild.build({
                entryPoints: [objectInspectEntry],
                bundle: true,
                format: "iife",
                globalName: "ObjectInspect",
                platform: "browser",
                write: false,
            });
            const bundledCode = bundleResult.outputFiles[0]?.text;
            if (typeof bundledCode !== "string") {
                throw new Error("Failed to bundle object-inspect for QuickJS");
            }
            const consoleShim = await readFile(consoleShimPath, "utf8");
            inspectRuntimeCode = `${bundledCode}\n${consoleShim}`;
        },
        resolveId(id: string) {
            if (id === VIRTUAL_ID) return resolvedVirtualModuleId;
        },
        load(id: string) {
            if (id === resolvedVirtualModuleId) {
                return `export default ${JSON.stringify(inspectRuntimeCode)}`;
            }
        },
    };
};
