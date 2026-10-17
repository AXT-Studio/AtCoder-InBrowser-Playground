import inputScannerSource from "./InputScanner.ts?raw";
import type { GenerateTemplateParams, TemplateRole } from "../types";

const ROLE_LABEL: Record<TemplateRole, string> = {
    submission: "[Main] Submission",
    compare: "[Compare] Comparative Implementation",
    generator: "[Gen] Testcase Input Generator",
};

export const generateTemplate = ({ contestTitle, taskTitle, taskURL, role }: GenerateTemplateParams): string =>
    `\
// ================================================================
// ${contestTitle}
// ${taskTitle}
// (URL: ${taskURL})
// TypeScript (Node.js or Bun, w/ InputScanner) ${ROLE_LABEL[role]}
// ================================================================

function Main(inputText: string): void {
    const scanner = new InputScanner(inputText);
    // Add your code here
}

${inputScannerSource.trim()}

// Please do not change the following code.
Main(require("fs").readFileSync("/dev/stdin", "utf8"));
`;
