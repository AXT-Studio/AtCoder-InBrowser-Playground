import type { DefaultTheme } from "vitepress";

export const sidebar: DefaultTheme.Sidebar = [
    {
        text: "Guide",
        items: [
            { text: "AIBPを選ぶ理由", link: "/why-aibp" },
            { text: "AIBPの始め方", link: "/getting-started" },
        ],
    },
    {
        text: "Release Notes",
        items: [
            { text: "ver0.2.0 (β)", link: "/release-notes/v0.2.0" },
        ],
    },
    {
        text: "Privacy Policy",
        items: [
            { text: "プライバシーポリシー", link: "/privacy-policy" },
        ],
    },
];
