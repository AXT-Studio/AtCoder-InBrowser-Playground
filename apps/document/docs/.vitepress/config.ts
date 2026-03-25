import { defineConfig } from "vitepress";
import { sidebar } from "./sidebar";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "AtCoder In-Browser Playground",
    description:
        "Web extension provides a code editor/tester for AtCoder, which can be completed in the browser.",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        sidebar,

        nav: [
            { text: "Home", link: "/" },
            { text: "はじめる", link: "/getting-started" },
            { text: "使い方", link: "/usage" },
        ],

        socialLinks: [
            {
                icon: "github",
                link:
                    "https://github.com/AXT-AyaKoto/AtCoder-InBrowser-Playground",
            },
            {
                icon: "firefoxbrowser",
                link:
                    "https://addons.mozilla.org/ja/firefox/addon/atcoder-in-browser-playground/",
            },
            /* {
                icon: "chromewebstore",
                link:
                    "#",
            } */
        ],

        outline: "deep",
    },
    markdown: {
        breaks: true,
    },
    ignoreDeadLinks: true,
});
