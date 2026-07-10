import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ["@wxt-dev/auto-icons"],
    autoIcons: {
        baseIconPath: "assets/icon.png",
    },
    vite: () => ({
        plugins: [preact()],
    }),
});
