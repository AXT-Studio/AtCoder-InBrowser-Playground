import { defineConfig } from "vitepress";
import { sidebar } from "./sidebar";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "AIBP Docs",
    description:
        "AtCoder In-Browser Playground: Web extension provides a code editor/tester for AtCoder, which can be completed in the browser.",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        sidebar: sidebar.ja,

        nav: [
            { text: "Home", link: "/" },
            { text: "始め方・使い方", link: "/getting-started" },
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

    locales: {
        root: {
            label: "日本語",
            lang: "ja",
        },
        en: {
            label: "English",
            lang: "en",
            themeConfig: {
                nav: [
                    { text: "Home", link: "/" },
                    { text: "Usage", link: "/getting-started" },
                ],
                sidebar: sidebar.en,
            },
        },
    },
});
