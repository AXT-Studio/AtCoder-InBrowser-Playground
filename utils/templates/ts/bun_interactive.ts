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
    runtimeLabel: "TypeScript (Bun)",
    role,
    runtimeVariant: "INTERACTIVE",
})}

// Add init code here...

function Main(line: string): void {
    const inputs: string[] = line.split(" ");
    // Add your code here...
}

// Please do not change the following code.
declare global {
    interface Console {
        [Symbol.asyncIterator](): AsyncIterator<string>;
    }
}
const exitProcess = () => {
    // @ts-ignore
    process.exit(0);
};
for await (const line of console) {
    Main(line.trim());
}
export {};
`;
