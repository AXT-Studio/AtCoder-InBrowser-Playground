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
        text: "対応言語",
        link: "/supported-languages",
        items: [
            { text: "JavaScript", link: "/supported-languages/javascript" },
            { text: "TypeScript", link: "/supported-languages/typescript" },
            { text: "Python", link: "/supported-languages/python" },
        ],
    },
    {
        text: "Release Notes",
        items: [
            { text: "ver0.3.1 (β)", link: "/release-notes/v0.3.1" },
            { text: "ver0.3.0 (β)", link: "/release-notes/v0.3.0" },
            { text: "ver0.2.1 (β)", link: "/release-notes/v0.2.1" },
            { text: "ver0.2.0 (β)", link: "/release-notes/v0.2.0" },
        ],
    },
    {
        text: "Privacy Policy",
        items: [{ text: "プライバシーポリシー", link: "/privacy-policy" }],
    },
];
