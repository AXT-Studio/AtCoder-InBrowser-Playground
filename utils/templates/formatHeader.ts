import type { TemplateRole } from "./types";

const ROLE_LABEL: Record<TemplateRole, string> = {
    submission: "[Main] Submission",
    naive: "[Naive] Comparative Implementation",
    generator: "[Gen] Testcase Input Generator",
};

/**
 * テンプレ先頭ブロックを組み立てる。
 * role 行の例:
 * - `// TypeScript (Bun) [Main] Submission`
 * - `// TypeScript (Bun, using InputScanner) [Main] Submission`
 * - `// TypeScript (Bun, INTERACTIVE) [Naive] Comparative Implementation`
 */
export const formatTemplateHeader = (params: {
    contestTitle: string;
    taskTitle: string;
    taskURL: string;
    /** 例: `TypeScript (Bun)` */
    runtimeLabel: string;
    role: TemplateRole;
    /** 括弧内に追記。例: `using InputScanner` / `INTERACTIVE` → `(Bun, …)` */
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
