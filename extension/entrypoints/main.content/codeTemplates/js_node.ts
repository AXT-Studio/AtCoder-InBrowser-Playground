// ================================================================================================
// entrypoints/main.content/codeTemplates/js_node.ts
// JavaScript (Node.js) 用のテンプレートコードを返す関数
// ================================================================================================

export const getTemplate = (contestTitle: string, taskTitle: string, taskURL: string): string =>
    `\
// ================================================================
// ${contestTitle}
// ${taskTitle}
// (URL: ${taskURL})
// JavaScript (Node.js) Submission
// ================================================================

/** @type {(inputText: string) => void} */
function Main(inputText) {
    /** @type {string[][]} */
    const input = inputText.trim().split("\\n").map(row => row.split(" "));
    // Add your code here
}

Main(require("fs").readFileSync("/dev/stdin", "utf8"));
`;
