import { defineConfig } from "wxt";

import monacoTypescriptLibSplitPlugin from "./plugins/monacoTypescriptLibSplit";

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest: {
        version: "0.0.0",
        name: "AtCoder In-Browser Playground",
        description: "AtCoderの問題ページ上でコードを書いて実行・テストできる拡張機能",
        permissions: ["storage"],
        browser_specific_settings: {
            gecko: {
                id: "atcoder-in-browser-playground@axtech.dev",
            },
        },
    },
    vite: () => ({
        plugins: [monacoTypescriptLibSplitPlugin()],
        worker: {
            format: "es",
        },
    }),
});
