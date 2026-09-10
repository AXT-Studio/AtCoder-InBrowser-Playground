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
