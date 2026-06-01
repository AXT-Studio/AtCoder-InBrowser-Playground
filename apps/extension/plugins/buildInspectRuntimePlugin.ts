// ================================================================================================
// object-inspect + console formatter を QuickJS 向け IIFE としてビルドする Vite Virtual Plugin
// (生成したコードは TypeScript Runner Worker 内で QuickJS に渡す)
// ================================================================================================

import { createRequire } from "node:module";
import * as esbuild from "esbuild";

const require = createRequire(import.meta.url);

const INSPECT_RUNTIME_SHIM = `
function __aibpFormatConsoleArg(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const t = typeof value;
  if (t === 'string') return value;
  if (t === 'number') {
    if (Object.is(value, -0)) return '-0';
    return String(value);
  }
  if (t === 'boolean') return String(value);
  if (t === 'bigint') return String(value) + 'n';
  return ObjectInspect(value);
}

globalThis.__aibpSetupConsole = function() {
  globalThis.__stdout__ = [];
  globalThis.__stderr__ = [];
  globalThis.console = {
    log: (...args) => __stdout__.push(args.map(__aibpFormatConsoleArg).join(' ')),
    error: (...args) => __stderr__.push(args.map(__aibpFormatConsoleArg).join(' ')),
  };
};
`;

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
            inspectRuntimeCode = bundledCode + INSPECT_RUNTIME_SHIM;
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
