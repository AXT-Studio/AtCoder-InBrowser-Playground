// ================================================================================================
// コードテンプレート挿入のオーケストレーション
// ================================================================================================

import { generateTemplate as generateTemplate_js_bun } from "@/utils/templates/js/bun";
import { generateTemplate as generateTemplate_js_deno } from "@/utils/templates/js/deno";
import { generateTemplate as generateTemplate_js_node } from "@/utils/templates/js/node";
import { generateTemplate as generateTemplate_ts_bun } from "@/utils/templates/ts/bun";
import { generateTemplate as generateTemplate_ts_bun_interactive } from "@/utils/templates/ts/bun_interactive";
import { generateTemplate as generateTemplate_ts_bun_scanner } from "@/utils/templates/ts/bun_scanner";
import { generateTemplate as generateTemplate_ts_deno } from "@/utils/templates/ts/deno";
import { generateTemplate as generateTemplate_ts_deno_interactive } from "@/utils/templates/ts/deno_interactive";
import { generateTemplate as generateTemplate_ts_deno_scanner } from "@/utils/templates/ts/deno_scanner";
import { generateTemplate as generateTemplate_ts_node } from "@/utils/templates/ts/node";
import { generateTemplate as generateTemplate_ts_node_interactive } from "@/utils/templates/ts/node_interactive";
import { generateTemplate as generateTemplate_ts_node_scanner } from "@/utils/templates/ts/node_scanner";

type TemplateGenerator = (contestTitle: string, taskTitle: string, taskURL: string) => string;

export const CONFIRM_REPLACE_MESSAGE =
    "If you insert it now, the current code will be lost. Do you want to proceed?";

export type InsertTemplateResult =
    | { action: "not_found" }
    | { action: "cancelled" }
    | { action: "insert"; template: string };

// ----------------------------------------------------------------
// 挿入するテンプレートの用意
// ----------------------------------------------------------------

export const getTemplateGenerators = (): Record<string, TemplateGenerator> => {
    const result: Record<string, TemplateGenerator> = {};
    // ※`button#template-<templateKey>`の`<templateKey>`と対応させる形で、templatesに関数を追加する
    result.js_bun = generateTemplate_js_bun;
    result.js_deno = generateTemplate_js_deno;
    result.js_node = generateTemplate_js_node;
    result.ts_bun = generateTemplate_ts_bun;
    result.ts_deno = generateTemplate_ts_deno;
    result.ts_node = generateTemplate_ts_node;
    result.ts_bun_interactive = generateTemplate_ts_bun_interactive;
    result.ts_deno_interactive = generateTemplate_ts_deno_interactive;
    result.ts_node_interactive = generateTemplate_ts_node_interactive;
    result.ts_bun_scanner = generateTemplate_ts_bun_scanner;
    result.ts_deno_scanner = generateTemplate_ts_deno_scanner;
    result.ts_node_scanner = generateTemplate_ts_node_scanner;
    return result;
};

// ----------------------------------------------------------------
// テンプレート挿入
// ----------------------------------------------------------------

export const insertTemplate = (params: {
    templateKey: string;
    contestTitle: string;
    taskTitle: string;
    taskURL: string;
    currentCode: string;
    confirm: (message: string) => boolean;
}): InsertTemplateResult => {
    const { templateKey, contestTitle, taskTitle, taskURL, currentCode, confirm } = params;

    const getter = getTemplateGenerators()[templateKey];
    if (!getter) {
        console.error(`Template getter not found for key: ${templateKey}`);
        return { action: "not_found" };
    }

    const template = getter(contestTitle, taskTitle, taskURL);

    if (currentCode.trim() !== "" && !confirm(CONFIRM_REPLACE_MESSAGE)) {
        return { action: "cancelled" };
    }

    return { action: "insert", template };
};
