declare module "virtual:inspect-runtime" {
    const inspectRuntime: string;
    export default inspectRuntime;
}

declare module "virtual:corejs-polyfill" {
    const coreJsPolyfill: string;
    export default coreJsPolyfill;
}

declare module "*.ts?raw" {
    const source: string;
    export default source;
}

declare module "*emscripten-module.mjs" {
    import type { EmscriptenModuleLoaderOptions } from "@jitl/quickjs-ffi-types";
    const createEmscriptenModule: (options?: EmscriptenModuleLoaderOptions) => Promise<unknown>;
    export default createEmscriptenModule;
}

/** package の types が browser.d.ts（DefaultRubyVM のみ）を指すため、RubyVM を補う */
declare module "@ruby/wasm-wasi" {
    export class RubyVM {
        static instantiateModule(options: {
            module: WebAssembly.Module;
            wasip1: {
                wasiImport: WebAssembly.ModuleImports;
                initialize(instance: WebAssembly.Instance): void;
            };
            args?: string[];
        }): Promise<{ vm: RubyVM; instance: WebAssembly.Instance }>;
        eval(code: string): unknown;
    }
}
