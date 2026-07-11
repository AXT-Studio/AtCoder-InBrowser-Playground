import { formatTemplateHeader } from "../formatHeader";
import type { GenerateTemplateParams } from "../types";

export const generateTemplate = ({
    contestTitle,
    taskTitle,
    taskURL,
    role,
}: GenerateTemplateParams): string =>
    `\
${formatTemplateHeader({
    contestTitle,
    taskTitle,
    taskURL,
    runtimeLabel: "TypeScript (Node.js)",
    role,
    runtimeVariant: "INTERACTIVE",
})}

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
