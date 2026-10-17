import { formatTemplateHeader } from "../../formatHeader";
import type { GenerateTemplateParams } from "../../types";

export const generateTemplate = ({ contestTitle, taskTitle, taskURL, role }: GenerateTemplateParams): string =>
    `\
${formatTemplateHeader({
    contestTitle,
    taskTitle,
    taskURL,
    runtimeLabel: "TypeScript (Deno)",
    role,
})}

function Main(): void {
    // Write a testcase to stdout.
    // Example:
    // const n = 1 + Math.floor(Math.random() * 10);
    // console.log(n);
    console.log(randIntBetween(1, 100));
}

/** a以上b以下のランダムな整数を返します */
const randIntBetween = (a: number, b: number): number => Math.floor(Math.random() * (b - a + 1)) + a;

Main();
`;
