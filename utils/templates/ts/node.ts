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
})}

function Main(inputText: string): void {
    const input: string[][] = inputText.trim().split("\\n").map(row => row.split(" "));
    // Add your code here
}

// Please do not change the following code.
Main(require("fs").readFileSync("/dev/stdin", "utf8"));
`;
