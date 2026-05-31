// ================================================================================================
// TypeScript (Node.js) 用のテンプレートコードを返す関数
// ================================================================================================

import inputScanner from "./InputScanner?raw";

export const generateTemplate = (
    contestTitle: string,
    taskTitle: string,
    taskURL: string,
): string =>
    `\
// ================================================================
// ${contestTitle}
// ${taskTitle}
// (URL: ${taskURL})
// TypeScript (Node.js) Submission [using InputScanner]
// ================================================================

${inputScanner}

function Main(inputText: string): void {
    const scanner = new InputScanner(inputText);
    // Add your code here
}

// Please do not change the following code.
Main(require("fs").readFileSync("/dev/stdin", "utf8"));
`;
