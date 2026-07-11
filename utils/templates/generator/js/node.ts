import { formatTemplateHeader } from "../../formatHeader";
import type { GenerateTemplateParams } from "../../types";

export const generateTemplate = ({ contestTitle, taskTitle, taskURL, role }: GenerateTemplateParams): string =>
    `\
${formatTemplateHeader({
    contestTitle,
    taskTitle,
    taskURL,
    runtimeLabel: "JavaScript (Node.js)",
    role,
})}

function Main() {
    // Write a testcase to stdout.
    // Example:
    // const n = 1 + Math.floor(Math.random() * 10);
    // console.log(n);
    console.log(1);
}

Main();
`;
