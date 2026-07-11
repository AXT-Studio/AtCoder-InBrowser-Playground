import { formatTemplateHeader } from "../formatHeader";
import type { GenerateTemplateParams } from "../types";
import inputScannerSource from "./InputScanner.ts?raw";

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
    runtimeVariant: "using InputScanner",
})}

function Main(inputText: string): void {
    const scanner = new InputScanner(inputText);
    // Add your code here
}

${inputScannerSource.trim()}

// Please do not change the following code.
Main(require("fs").readFileSync("/dev/stdin", "utf8"));
`;
