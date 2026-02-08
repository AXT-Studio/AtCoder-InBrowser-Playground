import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest: {
        version: "0.0.0",
        name: "AtCoder In-Browser Playground",
        description: "AtCoderの問題ページ上でコードを書いて実行・テストできる拡張機能",
        permissions: ["storage"],
        web_accessible_resources: ["monaco-editor.js", "monaco-ts.js"],
        browser_specific_settings: {
            gecko: {
                id: "atcoder-in-browser-playground@axtech.dev",
            },
        },
    },
    vite: () => ({
        worker: {
            format: "es",
        },
    }),
});
