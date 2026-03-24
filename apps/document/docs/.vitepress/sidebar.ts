import type { DefaultTheme } from "vitepress";

export const sidebar: DefaultTheme.Sidebar = [
    {
        text: "Examples",
        items: [
            { text: "Markdown Examples", link: "/markdown-examples" },
            { text: "Runtime API Examples", link: "/api-examples" },
        ],
    },
];
