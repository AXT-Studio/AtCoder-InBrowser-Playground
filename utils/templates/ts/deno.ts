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
    runtimeLabel: "TypeScript (Deno)",
    role,
})}

function Main(inputText: string): void {
    const input: string[][] = inputText.trim().split("\\n").map(row => row.split(" "));
    // Add your code here
}

// Please do not change the following code.
export {}; // <- An empty export is required so that ts-check can determine it as a module.
Main(await Deno.readTextFile("/dev/stdin"));
`;
