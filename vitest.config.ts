import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";
import { buildInspectRuntimePlugin } from "./plugins/buildInspectRuntimePlugin";
import { buildPolyfillCodePlugin } from "./plugins/buildPolyfillByCoreJsBuilder";

export default defineConfig({
    // WxtVitest は wxt.config の vite.plugins を自動では載せないため、virtual modules 用 plugin を明示する
    plugins: [WxtVitest(), buildPolyfillCodePlugin(), buildInspectRuntimePlugin()],
    test: {
        // 純関数テストからで十分。UI/E2E は後段
        // QuickJS / esbuild-wasm / Pyodide の init があるので余裕を見る
        testTimeout: 30_000,
        hookTimeout: 60_000,
    },
});
