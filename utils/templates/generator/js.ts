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

function Main() {
    // Write a testcase to stdout.
    // Example:
    // const n = 1 + Math.floor(Math.random() * 10);
    // console.log(n);
    console.log(randIntBetween(1, 100));
}

/** a以上b以下のランダムな整数を返します */
const randIntBetween = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

Main();
`;
