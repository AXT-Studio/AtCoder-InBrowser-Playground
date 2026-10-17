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
// JavaScript (Node.js or Bun) ${ROLE_LABEL[role]}
// ================================================================

/** @type {(inputText: string) => void} */
function Main(inputText) {
    /** @type {string[][]} */
    const input = inputText.trim().split("\\n").map(row => row.split(" "));
    // Add your code here
}

// Please do not change the following code.
Main(require("fs").readFileSync("/dev/stdin", "utf8"));
`;
