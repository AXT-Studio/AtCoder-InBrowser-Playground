// ================================================================================================
// entrypoints/main.content/codeTemplates/js_bun.ts
// JavaScript (Bun) 用のテンプレートコードを返す関数
// ================================================================================================

export const getTemplate = (contestTitle: string, taskTitle: string, taskURL: string): string =>
    `\
// ================================================================
// ${contestTitle}
// ${taskTitle}
// (URL: ${taskURL})
// JavaScript (Bun) Submission
// ================================================================

/** @type {(inputText: string) => void} */
function Main(inputText) {
    /** @type {string[][]} */
    const input = inputText.trim().split("\\n").map(row => row.split(" "));
    // Add your code here
}

export {}; // <- An empty export is required so that ts-check can determine it as a module.
Main(await Bun.file("/dev/stdin").text());
`;
