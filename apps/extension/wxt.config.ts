import { defineConfig } from "wxt";
import { buildPolyfillCodePlugin } from "./plugins/buildPolyfillByCoreJsBuilder";
import monacoTypescriptLibSplitPlugin from "./plugins/monacoTypescriptLibSplit";
import bundlePyodidePublicAssetsHook from "./plugins/pyodide-public-assets-hook";

// See https://wxt.dev/api/config.html
export default defineConfig({
    hooks: {
        "build:publicAssets": bundlePyodidePublicAssetsHook,
    },
    manifest: ({ browser, manifestVersion }) => {
        const permissions = ["storage"];
        if (browser === "chrome" && manifestVersion === 3) {
            permissions.push("offscreen");
        }
        return {
            version: "1.0.1",
            name: "AtCoder In-Browser Playground",
            description: "AtCoderの問題ページ上でコードを書いて実行・テストできる拡張機能",
            permissions,
            browser_specific_settings: {
                gecko: {
                    id: "atcoder-in-browser-playground@axtech.dev",
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
        };
    },
    vite: () => ({
        plugins: [monacoTypescriptLibSplitPlugin(), buildPolyfillCodePlugin()],
        worker: {
            format: "es",
            plugins: () => [buildPolyfillCodePlugin()],
        },
    }),
    modules: ["@wxt-dev/auto-icons"],
});
