// ================================================================================================
// entrypoints/main.content/codeTemplates/ts_node.ts
// TypeScript (Node.js) 用のテンプレートコードを返す関数
// ================================================================================================

export const getTemplate = (contestTitle: string, taskTitle: string, taskURL: string): string =>
    `\
// ================================================================
// ${contestTitle}
// ${taskTitle}
// (URL: ${taskURL})
// TypeScript (Node.js) Submission
// ================================================================

function Main(inputText: string): void {
    const input: string[][] = inputText.trim().split("\\n").map(row => row.split(" "));
    // Add your code here
}

Main(require("fs").readFileSync("/dev/stdin", "utf8"));
`;
