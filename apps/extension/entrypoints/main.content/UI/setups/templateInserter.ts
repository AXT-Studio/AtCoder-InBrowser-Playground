// ================================================================================================
// コードテンプレ挿入ボタンのイベント設定を行う
// - コードテンプレートを生成する関数は、utils/templatesディレクトリ以下に置きます。
// - コードテンプレート生成ファイルは、以下の説明に沿ったgenerateTemplate関数をexportします。
//     - 引数
//         - contestTitle: string (例: "AtCoder Beginner Contest 123")
//         - taskTitle: string (例: "A - ABC String")
//         - taskURL: string (例: "https://atcoder.jp/contests/abc123/tasks/abc123_a")
//     - 返り値
//         - string (コードテンプレートの内容)
// ================================================================================================

import type { editor as monacoEditor } from "monaco-editor";
import { insertTemplate } from "@/entrypoints/main.content/services/insertTemplate";
import { getPageContext } from "@/utils/atcoder/pageContext";
import { foldLines } from "./foldLines";

export const setupTemplateInserter = async (
    container: HTMLDivElement,
    editor: monacoEditor.IStandaloneCodeEditor,
) => {
    const { contestTitle, taskTitle, taskURL } = getPageContext();

    const table = container.querySelector("#table-op-template");
    if (!table) {
        console.error("[AIBP] Template table not found.");
        return;
    }

    const buttons = table.querySelectorAll("button[id^='template-']");
    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const templateKey = button.id.replace("template-", "");
            const result = insertTemplate({
                templateKey,
                contestTitle,
                taskTitle,
                taskURL,
                currentCode: editor.getValue(),
                confirm: window.confirm,
            });

            if (result.action !== "insert") {
                return;
            }

            editor.setValue(result.template);
            foldLines(
                editor,
                (txt) => {
                    return /^s*class\b/.test(txt);
                },
                { delayMs: 100 },
            );
        });
    });
};
