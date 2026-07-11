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
    runtimeLabel: "JavaScript (Node.js)",
    role,
})}

/** @type {(inputText: string) => void} */
function Main(inputText) {
    /** @type {string[][]} */
    const input = inputText.trim().split("\\n").map(row => row.split(" "));
    // Add your code here
}

// Please do not change the following code.
Main(require("fs").readFileSync("/dev/stdin", "utf8"));
`;
