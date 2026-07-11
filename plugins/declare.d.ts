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
