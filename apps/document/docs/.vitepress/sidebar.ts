import type { DefaultTheme } from "vitepress";

export const sidebar: Record<string, DefaultTheme.Sidebar> = {
    ja: [
        {
            text: "AtCoder In-Browser Playground",
            items: [
                { text: "AIBPを選ぶ理由", link: "/why-aibp" },
                { text: "AIBPの始め方", link: "/getting-started" },
            ],
        },
    ],
    en: [
        {
            text: "AtCoder In-Browser Playground",
            items: [
                { text: "Why AIBP?", link: "/en/why-aibp" },
                { text: "How to Use AIBP", link: "/en/getting-started" },
            ],
        },
    ],
};
