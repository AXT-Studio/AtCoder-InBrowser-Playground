// ================================================================================================
// TypeScript (Node.js) 用のテンプレートコード (インタラクティブ版)を返す関数
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
// TypeScript (Node.js) Submission [INTERACTIVE]
// ================================================================

// Add init code here...

function Main(line: string): void {
    const inputs: string[] = line.split(" ");
    // Add your code here...
}

// Please do not change the following code.
// @ts-ignore
import readline from "node:readline";
// @ts-ignore
const rl = readline.createInterface({ input: process.stdin });
const exitProcess = () => {
    // @ts-ignore
    process.exit(0);
};
(async () => {
    for await (const line of rl) {
        Main((line as string).trim());
    }
})();
`;
