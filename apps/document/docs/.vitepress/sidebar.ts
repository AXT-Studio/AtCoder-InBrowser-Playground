import type { DefaultTheme } from "vitepress";

export const sidebar: DefaultTheme.Sidebar = [
    { text: "トップ", link: "/" },
    { text: "Quick Start", link: "/getting-started" },
    { text: "AIBPを選ぶ理由", link: "/why-aibp" },
    {
        text: "ガイド",
        link: "/guides/",
        items: [
            { text: "コードを書く", link: "/guides/code" },
            { text: "テストする", link: "/guides/test" },
            { text: "提出する", link: "/guides/submit" },
        ],
    },
    {
        text: "補足資料",
        link: "/references/",
        items: [
            { text: "推奨環境・対応環境", link: "/references/supported" },
            { text: "FAQ", link: "/references/faq" },
            { text: "既知の不具合", link: "/references/known-issues" },
        ],
    },
    {
        text: "更新履歴",
        link: "/changelogs/",
        items: [{ text: "ver1.0.0", link: "/changelogs/v1.0.0" }],
    },
    { text: "プライバシーポリシー", link: "/privacy-policy" },
];
