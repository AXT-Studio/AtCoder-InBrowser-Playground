import { generateTemplate as generateCppSolver } from "./cpp/solver";
import { generateTemplate as generateJsNode } from "./js/node";
import { generateTemplate as generateGenJsNode } from "./generator/js";
import { generateTemplate as generateGenLua } from "./generator/lua";
import { generateTemplate as generateGenTsNode } from "./generator/ts";
import { generateTemplate as generateLuaScanner } from "./lua/scanner";
import { generateTemplate as generateTsInteractive } from "./ts/interactive";
import { generateTemplate as generateTsScanner } from "./ts/scanner";
import type { TemplateDefinition, TemplateKind, TemplateRole } from "./types";

export type { GenerateTemplateParams, TemplateDefinition, TemplateKind, TemplateLanguage, TemplateRole } from "./types";

export const CONFIRM_REPLACE_MESSAGE = "If you insert it now, the current code will be lost. Do you want to proceed?";

export type InsertTemplateResult =
    | { action: "not_found" }
    | { action: "cancelled" }
    | { action: "insert"; template: string };

/** 全テンプレ定義（UI の select と insert の正本） */
export const TEMPLATE_DEFINITIONS: readonly TemplateDefinition[] = [
    {
        id: "ts_node_scanner",
        label: "TypeScript (Node.js) + Scanner",
        language: "typescript",
        kind: "solver",
        generate: generateTsScanner,
    },
    {
        id: "ts_node_interactive",
        label: "TypeScript (Node.js) Interactive",
        language: "typescript",
        kind: "solver",
        generate: generateTsInteractive,
    },
    { id: "js_node", label: "JavaScript (Node.js)", language: "javascript", kind: "solver", generate: generateJsNode },
    {
        id: "gen_ts_node",
        label: "Generator — TypeScript (Node.js)",
        language: "typescript",
        kind: "generator",
        generate: generateGenTsNode,
    },
    {
        id: "gen_js_node",
        label: "Generator — JavaScript (Node.js)",
        language: "javascript",
        kind: "generator",
        generate: generateGenJsNode,
    },
    {
        id: "lua_scanner",
        label: "Lua (w/ Input scanner)",
        language: "lua",
        kind: "solver",
        generate: generateLuaScanner,
    },
    {
        id: "gen_lua",
        label: "Generator — Lua",
        language: "lua",
        kind: "generator",
        generate: generateGenLua,
    },
    {
        id: "cpp_solver",
        label: "C++",
        language: "cpp",
        kind: "solver",
        generate: generateCppSolver,
    },
] as const;

const byId = new Map(TEMPLATE_DEFINITIONS.map((t) => [t.id, t]));

export const templateKindForRole = (role: TemplateRole): TemplateKind =>
    role === "generator" ? "generator" : "solver";

/** 言語・バッファ種別に合うテンプレ一覧 */
export const listTemplates = (language: string, role: TemplateRole): TemplateDefinition[] => {
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
