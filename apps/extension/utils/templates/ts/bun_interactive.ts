// ================================================================================================
// TypeScript (Bun) 用のテンプレートコード (インタラクティブ版)を返す関数
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
// TypeScript (Bun) Submission [INTERACTIVE]
// ================================================================

// Add init code here...

function Main(line: string): void {
    const inputs: string[] = line.split(" ");
    // Add your code here...
}

// Please do not change the following code.
declare global {
    interface Console {
        [Symbol.asyncIterator](): AsyncIterator<string>;
    }
}
const exitProcess = () => {
    // @ts-ignore
    process.exit(0);
};
for await (const line of console) {
    Main(line.trim());
}
export {};
`;
