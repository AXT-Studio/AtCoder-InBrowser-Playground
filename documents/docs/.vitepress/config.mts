import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "AtCoder In-Browser Playground Documents",
    description: "Web extension provides a code editor/tester for AtCoder, which can be completed in the browser",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: "Home", link: "/" },
            { text: "User Guide", link: "/guide/" },
            { text: "Contribution", link: "/contribution/" },
        ],

        sidebar: [
            {
                text: "User Guide",
                link: "/guide/",
            },
            {
                text: "Contribution",
                link: "/contribution/",
            },
        ],

        outline: "deep",

        socialLinks: [
            { icon: "github", link: "https://github.com/AXT-AyaKoto/AtCoder-InBrowser-Playground" },
            // { icon: "chromewebstore", link: "#chrome" },
            // { icon: "firefoxbrowser", link: "#firefox" },
        ],
    },
    markdown: {
        math: true,
        breaks: true,
    },
});
