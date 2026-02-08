// ================================================================================================
// entrypoints/main.content/uiSetups/insertTemplate.ts
// コードテンプレ挿入ボタンのイベント設定を行う
// ================================================================================================
// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { editor as monacoEditor } from "monaco-editor";
import { getTemplate as getTemplate_js_bun } from "../codeTemplates/js_bun";
import { getTemplate as getTemplate_js_deno } from "../codeTemplates/js_deno";
import { getTemplate as getTemplate_js_node } from "../codeTemplates/js_node";
import { getTemplate as getTemplate_ts_bun } from "../codeTemplates/ts_bun";
import { getTemplate as getTemplate_ts_deno } from "../codeTemplates/ts_deno";
import { getTemplate as getTemplate_ts_node } from "../codeTemplates/ts_node";
import { getTemplate as getTemplate_txt_cat } from "../codeTemplates/txt_cat";

// ----------------------------------------------------------------
// 挿入するテンプレートの用意
// ----------------------------------------------------------------

// ==== 挿入するテンプレートを取得する ====
const templateGetters: Record<string, (contestTitle: string, taskTitle: string, taskURL: string) => string> = {};
templateGetters.js_node = getTemplate_js_node;
templateGetters.js_deno = getTemplate_js_deno;
templateGetters.js_bun = getTemplate_js_bun;
templateGetters.ts_node = getTemplate_ts_node;
templateGetters.ts_deno = getTemplate_ts_deno;
templateGetters.ts_bun = getTemplate_ts_bun;
templateGetters.txt_cat = getTemplate_txt_cat;

// ----------------------------------------------------------------
// 挿入処理を行う関数
// ----------------------------------------------------------------

const insertTemplate = (templateKey: string, contestTitle: string, taskTitle: string, taskURL: string, editor: monacoEditor.IStandaloneCodeEditor) => {
    // ==== 使うテンプレートを取得 ====
    const getter = templateGetters[templateKey];
    if (!getter) {
        console.error(`Template getter not found for key: ${templateKey}`);
        return;
    }
    // ==== テンプレート関数からコードを取得 ====
    const template = getter(contestTitle, taskTitle, taskURL);
    // ==== エディターのコードが空出ない場合、confirmダイアログを表示 ====
    const currentCode = editor.getValue();
    if (currentCode.trim() !== "") {
        const confirmReplace = window.confirm("If you insert it now, the current code will be lost. Do you want to proceed?");
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

export const setupInsertTemplate = (container: HTMLDivElement, editor: monacoEditor.IStandaloneCodeEditor) => {
    // ==== contestTitle, taskTitle, taskURLを取得 ====
    const contestTitle = (window.document.querySelector("nav .contest-title") as HTMLElement)?.innerText.trim() ?? "Unknown Contest";
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
