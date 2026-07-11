import { generateTemplate as generateJsBun } from "./js/bun";
import { generateTemplate as generateJsDeno } from "./js/deno";
import { generateTemplate as generateJsNode } from "./js/node";
import { generateTemplate as generateGenJsBun } from "./generator/js/bun";
import { generateTemplate as generateGenJsDeno } from "./generator/js/deno";
import { generateTemplate as generateGenJsNode } from "./generator/js/node";
import { generateTemplate as generateGenTsBun } from "./generator/ts/bun";
import { generateTemplate as generateGenTsDeno } from "./generator/ts/deno";
import { generateTemplate as generateGenTsNode } from "./generator/ts/node";
import { generateTemplate as generateTsBun } from "./ts/bun";
import { generateTemplate as generateTsBunInteractive } from "./ts/bun_interactive";
import { generateTemplate as generateTsBunScanner } from "./ts/bun_scanner";
import { generateTemplate as generateTsDeno } from "./ts/deno";
import { generateTemplate as generateTsDenoInteractive } from "./ts/deno_interactive";
import { generateTemplate as generateTsDenoScanner } from "./ts/deno_scanner";
import { generateTemplate as generateTsNode } from "./ts/node";
import { generateTemplate as generateTsNodeInteractive } from "./ts/node_interactive";
import { generateTemplate as generateTsNodeScanner } from "./ts/node_scanner";
import type { TemplateDefinition, TemplateKind, TemplateLanguage, TemplateRole } from "./types";

export type { GenerateTemplateParams, TemplateDefinition, TemplateKind, TemplateLanguage, TemplateRole } from "./types";

export const CONFIRM_REPLACE_MESSAGE =
    "If you insert it now, the current code will be lost. Do you want to proceed?";

export type InsertTemplateResult =
    | { action: "not_found" }
    | { action: "cancelled" }
    | { action: "insert"; template: string };

/** 全テンプレ定義（UI の select と insert の正本） */
export const TEMPLATE_DEFINITIONS: readonly TemplateDefinition[] = [
    { id: "ts_bun", label: "TypeScript (Bun)", language: "typescript", kind: "solver", generate: generateTsBun },
    {
        id: "ts_bun_scanner",
        label: "TypeScript (Bun) + Scanner",
        language: "typescript",
        kind: "solver",
        generate: generateTsBunScanner,
    },
    {
        id: "ts_bun_interactive",
        label: "TypeScript (Bun) Interactive",
        language: "typescript",
        kind: "solver",
        generate: generateTsBunInteractive,
    },
    { id: "ts_deno", label: "TypeScript (Deno)", language: "typescript", kind: "solver", generate: generateTsDeno },
    {
        id: "ts_deno_scanner",
        label: "TypeScript (Deno) + Scanner",
        language: "typescript",
        kind: "solver",
        generate: generateTsDenoScanner,
    },
    {
        id: "ts_deno_interactive",
        label: "TypeScript (Deno) Interactive",
        language: "typescript",
        kind: "solver",
        generate: generateTsDenoInteractive,
    },
    {
        id: "ts_node",
        label: "TypeScript (Node.js)",
        language: "typescript",
        kind: "solver",
        generate: generateTsNode,
    },
    {
        id: "ts_node_scanner",
        label: "TypeScript (Node.js) + Scanner",
        language: "typescript",
        kind: "solver",
        generate: generateTsNodeScanner,
    },
    {
        id: "ts_node_interactive",
        label: "TypeScript (Node.js) Interactive",
        language: "typescript",
        kind: "solver",
        generate: generateTsNodeInteractive,
    },
    { id: "js_bun", label: "JavaScript (Bun)", language: "javascript", kind: "solver", generate: generateJsBun },
    { id: "js_deno", label: "JavaScript (Deno)", language: "javascript", kind: "solver", generate: generateJsDeno },
    { id: "js_node", label: "JavaScript (Node.js)", language: "javascript", kind: "solver", generate: generateJsNode },
    {
        id: "gen_ts_bun",
        label: "Generator — TypeScript (Bun)",
        language: "typescript",
        kind: "generator",
        generate: generateGenTsBun,
    },
    {
        id: "gen_ts_deno",
        label: "Generator — TypeScript (Deno)",
        language: "typescript",
        kind: "generator",
        generate: generateGenTsDeno,
    },
    {
        id: "gen_ts_node",
        label: "Generator — TypeScript (Node.js)",
        language: "typescript",
        kind: "generator",
        generate: generateGenTsNode,
    },
    {
        id: "gen_js_bun",
        label: "Generator — JavaScript (Bun)",
        language: "javascript",
        kind: "generator",
        generate: generateGenJsBun,
    },
    {
        id: "gen_js_deno",
        label: "Generator — JavaScript (Deno)",
        language: "javascript",
        kind: "generator",
        generate: generateGenJsDeno,
    },
    {
        id: "gen_js_node",
        label: "Generator — JavaScript (Node.js)",
        language: "javascript",
        kind: "generator",
        generate: generateGenJsNode,
    },
] as const;

const byId = new Map(TEMPLATE_DEFINITIONS.map((t) => [t.id, t]));

export const templateKindForRole = (role: TemplateRole): TemplateKind =>
    role === "generator" ? "generator" : "solver";

/** 言語・バッファ種別に合うテンプレ一覧 */
export const listTemplates = (language: string, role: TemplateRole): TemplateDefinition[] => {
    if (language !== "typescript" && language !== "javascript") return [];
    const kind = templateKindForRole(role);
    return TEMPLATE_DEFINITIONS.filter((t) => t.language === language && t.kind === kind);
};

export const insertTemplate = (params: {
    templateKey: string;
    contestTitle: string;
    taskTitle: string;
    taskURL: string;
    role: TemplateRole;
    currentCode: string;
    confirm: (message: string) => boolean;
}): InsertTemplateResult => {
    const def = byId.get(params.templateKey);
    if (!def) {
        console.error(`Template not found for key: ${params.templateKey}`);
        return { action: "not_found" };
    }

    const template = def.generate({
        contestTitle: params.contestTitle,
        taskTitle: params.taskTitle,
        taskURL: params.taskURL,
        role: params.role,
    });

    if (params.currentCode.trim() !== "" && !params.confirm(CONFIRM_REPLACE_MESSAGE)) {
        return { action: "cancelled" };
    }

    return { action: "insert", template };
};
