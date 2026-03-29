import { defineConfig } from "wxt";
import { buildPolyfillCodePlugin } from "./plugins/buildPolyfillByCoreJsBuilder";
import bundlePyodideRuntimeFilesPlugin from "./plugins/bundlePyodideRuntimeFiles";
import monacoTypescriptLibSplitPlugin from "./plugins/monacoTypescriptLibSplit";

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest: {
        version: "0.2.1",
        name: "AtCoder In-Browser Playground",
        description:
            "AtCoderの問題ページ上でコードを書いて実行・テストできる拡張機能",
        permissions: ["storage"],
        browser_specific_settings: {
            gecko: {
                id: "atcoder-in-browser-playground@axtech.dev",
                // @ts-expect-error - data_collection_permissions is required by Firefox but not yet in WXT types
                data_collection_permissions: {
                    required: ["none"], // This extension does not collect or transmit any data
                },
            },
        },
        content_security_policy: {
            extension_pages:
                "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' https://cdn.jsdelivr.net https://files.pythonhosted.org https://pypi.org ws:;",
        },
        web_accessible_resources: [
            {
                resources: [
                    "unlisted_monaco-editor.js",
                    "unlisted_monaco-ts-lib.js",
                    "unlisted_monaco-ts.js",
                    "assets/*",
                    "assets/pyodide/*",
                ],
                matches: ["https://atcoder.jp/*"],
            },
        ],
    },
    vite: () => ({
        plugins: [
            monacoTypescriptLibSplitPlugin(),
            buildPolyfillCodePlugin(),
            bundlePyodideRuntimeFilesPlugin(),
        ],
        worker: {
            format: "es",
        },
    }),
});
