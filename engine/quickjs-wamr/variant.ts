// Vite は拡張子なし import で同名の .mjs を先に取る。この隣に variant.mjs を置かないこと。
import type { EmscriptenModuleLoader, QuickJSEmscriptenModule, QuickJSSyncVariant } from "@jitl/quickjs-ffi-types";
import wasmUrl from "./dist/emscripten-module.wasm?url&no-inline";
import createEmscriptenModule from "./dist/emscripten-module.mjs";

const loadWasmBinary = async (): Promise<ArrayBuffer> => {
    // Vitest は `?url` を相対パスにするので、生成 wasm をディスクから読む。
    // `MODE === "test"` は production / dev ビルドで死コードになり、node:fs は Worker に入らない。
    if (import.meta.env.MODE === "test") {
        const { readFile } = await import("node:fs/promises");
        const { dirname, join } = await import("node:path");
        const { fileURLToPath } = await import("node:url");
        const wasmPath = join(dirname(fileURLToPath(import.meta.url)), "dist", "emscripten-module.wasm");
        const buf = await readFile(wasmPath);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    const res = await fetch(wasmUrl);
    if (!res.ok) {
        throw new Error(`Failed to fetch QuickJS wasm (${String(res.status)})`);
    }
    return await res.arrayBuffer();
};

const variant: QuickJSSyncVariant = {
    type: "sync",
    importFFI: (() => import("./ffi").then((mod) => mod.QuickJSFFI)) as QuickJSSyncVariant["importFFI"],
    importModuleLoader: async () => {
        const wasmBinary = await loadWasmBinary();
        const loader: EmscriptenModuleLoader<QuickJSEmscriptenModule> = (options = {}) =>
            createEmscriptenModule({
                ...options,
                instantiateWasm: (imports, onSuccess) =>
                    WebAssembly.instantiate(wasmBinary, imports).then((result) => {
                        onSuccess(result.instance);
                        return result.instance.exports;
                    }),
            }) as Promise<QuickJSEmscriptenModule>;
        return loader;
    },
};

export default variant;
