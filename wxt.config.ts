import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";
import { buildInspectRuntimePlugin } from "./plugins/buildInspectRuntimePlugin";
import { buildPolyfillCodePlugin } from "./plugins/buildPolyfillByCoreJsBuilder";
import monacoTypescriptLibSplitPlugin from "./plugins/monacoTypescriptLibSplit";
import { registerPyodidePublicAssets } from "./plugins/pyodidePublicAssetsHook";

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ["@wxt-dev/auto-icons"],
    autoIcons: {
        baseIconPath: "assets/icon.png",
    },
    hooks: {
        "build:publicAssets": async (wxt, files) => {
            await registerPyodidePublicAssets(wxt, files);
        },
    },
    manifest: ({ browser, manifestVersion }) => {
        const permissions = ["storage"];
        if (browser === "chrome" && manifestVersion === 3) {
            permissions.push("offscreen");
        }
        return {
            version: "2.0.0",
            name: "AtCoder In-Browser Playground",
            description: "AtCoderの問題ページ上でコードを書いて実行・テストできる拡張機能",
            permissions,
            content_security_policy: {
                extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' ws:;",
            },
            browser_specific_settings: {
                gecko: {
                    id: "atcoder-in-browser-playground@axtech.dev",
                    data_collection_permissions: {
                        required: ["none"], // This extension does not collect or transmit any data
                    },
                },
            },
            web_accessible_resources: [
                {
                    resources: [
                        "unlisted_monaco-editor.js",
                        "unlisted_monaco-ts-lib.js",
                        "unlisted_monaco-ts.js",
                    ],
                    matches: ["https://atcoder.jp/*"],
                },
            ],
        };
    },
    vite: () => ({
        plugins: [preact(), monacoTypescriptLibSplitPlugin(), buildPolyfillCodePlugin(), buildInspectRuntimePlugin()],
        optimizeDeps: {
            exclude: ["pyodide"],
        },
        // Runner Worker からも virtual modules を import するため
        worker: {
            format: "es",
            plugins: () => [buildPolyfillCodePlugin(), buildInspectRuntimePlugin()],
        },
    }),
});
