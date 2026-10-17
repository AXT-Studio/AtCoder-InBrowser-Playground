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
// TypeScript (Node.js or Bun, INTERACTIVE) ${ROLE_LABEL[role]}
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
    process.exit(0);
};
(async () => {
    for await (const line of rl) {
        Main((line as string).trim());
    }
})();
`;
