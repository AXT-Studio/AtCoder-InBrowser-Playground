import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";
import { buildInspectRuntimePlugin } from "./plugins/buildInspectRuntimePlugin";
import { buildPolyfillCodePlugin } from "./plugins/buildPolyfillByCoreJsBuilder";
import monacoTypescriptLibSplitPlugin from "./plugins/monacoTypescriptLibSplit";

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ["@wxt-dev/auto-icons"],
    autoIcons: {
        baseIconPath: "assets/icon.png",
    },
    manifest: ({ browser, manifestVersion }) => {
        const permissions = ["storage"];
        if (browser === "chrome" && manifestVersion === 3) {
            permissions.push("offscreen");
        }
        return {
            permissions,
            content_security_policy: {
                extension_pages:
                    "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' ws:;",
            },
            web_accessible_resources: [
                {
                    resources: [
                        "unlisted_monaco-editor.js",
                        "unlisted_monaco-ts-lib.js",
                        "unlisted_monaco-ts.js",
                        "*.woff",
                        "*.woff2",
                    ],
                    matches: ["https://atcoder.jp/*"],
                },
            ],
        };
    },
    vite: () => ({
        plugins: [
            preact(),
            monacoTypescriptLibSplitPlugin(),
            buildPolyfillCodePlugin(),
            buildInspectRuntimePlugin(),
        ],
        // Runner Worker からも virtual modules を import するため
        worker: {
            format: "es",
            plugins: () => [buildPolyfillCodePlugin(), buildInspectRuntimePlugin()],
        },
    }),
});
