import type { TemplateRole } from "./types";

const ROLE_LABEL: Record<TemplateRole, string> = {
    submission: "[Main] Submission",
    compare: "[Compare] Comparative Implementation",
    generator: "[Gen] Testcase Input Generator",
};

/**
 * テンプレ先頭ブロックを組み立てる。
 * role 行の例:
 * - `// TypeScript (Node.js) [Main] Submission`
 * - `// TypeScript (Node.js, using InputScanner) [Main] Submission`
 * - `// TypeScript (Node.js, INTERACTIVE) [Compare] Comparative Implementation`
 */
export const formatTemplateHeader = (params: {
    contestTitle: string;
    taskTitle: string;
    taskURL: string;
    /** 例: `TypeScript (Node.js)` */
    runtimeLabel: string;
    role: TemplateRole;
    /** 括弧内に追記。例: `using InputScanner` / `INTERACTIVE` → `(Node.js, …)` */
    runtimeVariant?: string;
}): string => {
    const runtimeDisplay = params.runtimeVariant
        ? `${params.runtimeLabel.slice(0, -1)}, ${params.runtimeVariant})`
        : params.runtimeLabel;
    const roleLine = `// ${runtimeDisplay} ${ROLE_LABEL[params.role]}`;

    return `\
// ================================================================
// ${params.contestTitle}
// ${params.taskTitle}
// (URL: ${params.taskURL})
${roleLine}
// ================================================================`;
};
