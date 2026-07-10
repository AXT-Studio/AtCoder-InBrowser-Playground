import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
    plugins: [WxtVitest()],
    test: {
        // 純関数テストからで十分。UI/E2E は後段
    },
});
