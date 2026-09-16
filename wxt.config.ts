import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";
import { buildInspectRuntimePlugin } from "./plugins/buildInspectRuntimePlugin";
import { buildPolyfillCodePlugin } from "./plugins/buildPolyfillByCoreJsBuilder";
import monacoTypescriptLibSplitPlugin from "./plugins/monacoTypescriptLibSplit";
import { registerCppPublicAssets } from "./plugins/cppPublicAssetsHook";
import { registerPyodidePublicAssets } from "./plugins/pyodidePublicAssetsHook";
import { registerRubyPublicAssets } from "./plugins/rubyPublicAssetsHook";

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ["@wxt-dev/auto-icons"],
    autoIcons: {
        baseIconPath: "assets/icon.png",
    },
    hooks: {
        "build:publicAssets": async (wxt, files) => {
            await registerPyodidePublicAssets(wxt, files);
            await registerRubyPublicAssets(wxt, files);
            await registerCppPublicAssets(wxt, files);
        },
    },
    manifest: ({ browser, manifestVersion }) => {
        const permissions = ["storage"];
        if (browser === "chrome" && manifestVersion === 3) {
            permissions.push("offscreen");
        }
        return {
            version: "2.6.0",
            name: "AtCoder In-Browser Playground",
            description: "AtCoderの問題ページ上でコードを書いて実行・テストできる拡張機能",
            permissions,
            content_security_policy: {
                // xeus-cpp の embind / EM_ASM が Function()/eval を使う。
                // Chrome MV3 の extension_pages には 'unsafe-eval' を付けられない。
                extension_pages:
                    browser === "firefox"
                        ? "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' ws:;"
                        : "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' ws:;",
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
                    resources: ["unlisted_monaco-editor.js", "unlisted_monaco-ts-lib.js", "unlisted_monaco-ts.js"],
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
        assetsInclude: ["**/*.wasm"],
        // Runner Worker からも virtual modules を import するため
        worker: {
            format: "es",
            plugins: () => [buildPolyfillCodePlugin(), buildInspectRuntimePlugin()],
        },
    }),
});
