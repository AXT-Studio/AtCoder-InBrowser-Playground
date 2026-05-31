// ================================================================================================
// TypeScript (Deno) 用のテンプレートコードを返す関数
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
// TypeScript (Deno) Submission [using InputScanner]
// ================================================================

${inputScanner}

function Main(inputText: string): void {
    const scanner = new InputScanner(inputText);
    // Add your code here
}

// Please do not change the following code.
export {}; // <- An empty export is required so that ts-check can determine it as a module.
Main(await Deno.readTextFile("/dev/stdin"));
`;
