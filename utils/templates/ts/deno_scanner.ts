import { formatTemplateHeader } from "../formatHeader";
import type { GenerateTemplateParams } from "../types";
import inputScannerSource from "./InputScanner.ts?raw";

export const generateTemplate = ({ contestTitle, taskTitle, taskURL, role }: GenerateTemplateParams): string =>
    `\
${formatTemplateHeader({
    contestTitle,
    taskTitle,
    taskURL,
    runtimeLabel: "TypeScript (Deno)",
    role,
    runtimeVariant: "using InputScanner",
})}

function Main(inputText: string): void {
    const scanner = new InputScanner(inputText);
    // Add your code here
}

${inputScannerSource.trim()}

// Please do not change the following code.
export {}; // <- An empty export is required so that ts-check can determine it as a module.
Main(await Deno.readTextFile("/dev/stdin"));
`;
