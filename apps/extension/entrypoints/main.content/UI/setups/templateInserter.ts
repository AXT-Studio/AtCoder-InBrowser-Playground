// ================================================================================================
// コードテンプレ挿入ボタンのイベント設定を行う
// - コードテンプレートを生成する関数は、templateGeneratorsディレクトリ以下に置きます。
// - コードテンプレート生成ファイルは、以下の説明に沿ったgenerateTemplate関数をexportします。
//     - 引数
//         - contestTitle: string (例: "AtCoder Beginner Contest 123")
//         - taskTitle: string (例: "A - ABC String")
//         - taskURL: string (例: "https://atcoder.jp/contests/abc123/tasks/abc123_a")
//     - 返り値
//         - string (コードテンプレートの内容)
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { editor as monacoEditor } from "monaco-editor";
import { generateTemplate as generateTemplate_js_bun } from "./templateGenerators/js/bun";
import { generateTemplate as generateTemplate_js_deno } from "./templateGenerators/js/deno";
import { generateTemplate as generateTemplate_js_node } from "./templateGenerators/js/node";
import { generateTemplate as generateTemplate_ts_bun } from "./templateGenerators/ts/bun";
import { generateTemplate as generateTemplate_ts_bun_interactive } from "./templateGenerators/ts/bun_interactive";
import { generateTemplate as generateTemplate_ts_deno } from "./templateGenerators/ts/deno";
import { generateTemplate as generateTemplate_ts_deno_interactive } from "./templateGenerators/ts/deno_interactive";
import { generateTemplate as generateTemplate_ts_node } from "./templateGenerators/ts/node";
import { generateTemplate as generateTemplate_ts_node_interactive } from "./templateGenerators/ts/node_interactive";

// ----------------------------------------------------------------
// 挿入するテンプレートの用意
// ----------------------------------------------------------------

// ==== 挿入するテンプレートを取得する ====
const templateGenerators: Record<
    string,
    (contestTitle: string, taskTitle: string, taskURL: string) => string
> = {};
// ※`button#template-<templateKey>`の`<templateKey>`と対応させる形で、templateGeneratorsに関数を追加する
templateGenerators.js_bun = generateTemplate_js_bun;
templateGenerators.js_deno = generateTemplate_js_deno;
templateGenerators.js_node = generateTemplate_js_node;
templateGenerators.ts_bun = generateTemplate_ts_bun;
templateGenerators.ts_deno = generateTemplate_ts_deno;
templateGenerators.ts_node = generateTemplate_ts_node;
templateGenerators.ts_bun_interactive = generateTemplate_ts_bun_interactive;
templateGenerators.ts_deno_interactive = generateTemplate_ts_deno_interactive;
templateGenerators.ts_node_interactive = generateTemplate_ts_node_interactive;

// ----------------------------------------------------------------
// 挿入処理を行う関数
// ----------------------------------------------------------------

const insertTemplate = (
    templateKey: string,
    contestTitle: string,
    taskTitle: string,
    taskURL: string,
    editor: monacoEditor.IStandaloneCodeEditor,
) => {
    // ==== 使うテンプレートを取得 ====
    const getter = templateGenerators[templateKey];
    if (!getter) {
        console.error(`Template getter not found for key: ${templateKey}`);
        return;
    }
    // ==== テンプレート関数からコードを取得 ====
    const template = getter(contestTitle, taskTitle, taskURL);
    // ==== エディターのコードが空でない場合、confirmダイアログを表示 ====
    const currentCode = editor.getValue();
    if (currentCode.trim() !== "") {
        const confirmReplace = window.confirm(
            "If you insert it now, the current code will be lost. Do you want to proceed?",
        );
        if (!confirmReplace) {
            return;
        }
    }
    // ==== エディターにコードを挿入 ====
    editor.setValue(template);
};

// ----------------------------------------------------------------
// イベントを設定する関数
// (table#table-op-template 内にある各ボタンに対して挿入処理を設定する)
// ----------------------------------------------------------------

export const setupTemplateInserter = async (
    container: HTMLDivElement,
    editor: monacoEditor.IStandaloneCodeEditor,
) => {
    // ==== contestTitle, taskTitle, taskURLを取得 ====
    const contestTitle =
        (window.document.querySelector("nav .contest-title") as HTMLElement)?.innerText.trim() ??
        "Unknown Contest";
    const taskTitle = window.document.title.trim() ?? "Unknown Task";
    const taskURL = window.location.href ?? "<Unknown URL>";
    // ==== 実際の挿入処理を設定 ====
    const table = container.querySelector("#table-op-template");
    if (!table) {
        console.error("[AIBP] Template table not found.");
        return;
    }
    const buttons = table.querySelectorAll("button[id^='template-']");
    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const templateKey = button.id.replace("template-", "");
            insertTemplate(templateKey, contestTitle, taskTitle, taskURL, editor);
        });
    });
};
