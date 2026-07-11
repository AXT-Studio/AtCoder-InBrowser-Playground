import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";
import { buildInspectRuntimePlugin } from "./plugins/buildInspectRuntimePlugin";
import { buildPolyfillCodePlugin } from "./plugins/buildPolyfillByCoreJsBuilder";

export default defineConfig({
    // WxtVitest は wxt.config の vite.plugins を自動では載せないため、virtual modules 用 plugin を明示する
    plugins: [WxtVitest(), buildPolyfillCodePlugin(), buildInspectRuntimePlugin()],
    test: {
        // 純関数テストからで十分。UI/E2E は後段
        // QuickJS / esbuild-wasm の init があるので TS runner は余裕を見る
        testTimeout: 30_000,
        hookTimeout: 30_000,
    },
});
