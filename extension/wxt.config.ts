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
                // @ts-expect-error - data_collection_permissions is required by Firefox but not yet in WXT types
                data_collection_permissions: {
                    required: ["none"], // This extension does not collect or transmit any data
                },
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
