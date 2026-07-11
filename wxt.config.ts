import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";
import { buildInspectRuntimePlugin } from "./plugins/buildInspectRuntimePlugin";
import { buildPolyfillCodePlugin } from "./plugins/buildPolyfillByCoreJsBuilder";

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
        };
    },
    vite: () => ({
        plugins: [preact(), buildPolyfillCodePlugin(), buildInspectRuntimePlugin()],
        // Runner Worker からも virtual modules を import するため
        worker: {
            format: "es",
            plugins: () => [buildPolyfillCodePlugin(), buildInspectRuntimePlugin()],
        },
    }),
});
