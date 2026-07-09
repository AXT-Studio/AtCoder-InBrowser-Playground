// ================================================================================================
// TypeScript (Deno) 用のテンプレートコードを返す関数
// ================================================================================================

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
// TypeScript (Deno) Submission
// ================================================================

function Main(inputText: string): void {
    const input: string[][] = inputText.trim().split("\\n").map(row => row.split(" "));
    // Add your code here
}

// Please do not change the following code.
export {}; // <- An empty export is required so that ts-check can determine it as a module.
Main(await Deno.readTextFile("/dev/stdin"));
`;
