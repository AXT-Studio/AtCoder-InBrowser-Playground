// ================================================================================================
// entrypoints/main.content/codeTemplates/ts_bun.ts
// TypeScript (Bun) 用のテンプレートコードを返す関数
// ================================================================================================

export const getTemplate = (contestTitle: string, taskTitle: string, taskURL: string): string =>
    `\
// ================================================================
// ${contestTitle}
// ${taskTitle}
// (URL: ${taskURL})
// TypeScript (Bun) Submission
// ================================================================

function Main(inputText: string): void {
    const input: string[][] = inputText.trim().split("\\n").map(row => row.split(" "));
    // Add your code here
}

export {}; // <- An empty export is required so that ts-check can determine it as a module.
Main(await Bun.file("/dev/stdin").text());
`;
