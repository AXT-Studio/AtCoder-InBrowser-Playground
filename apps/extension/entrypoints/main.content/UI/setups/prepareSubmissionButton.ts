// ================================================================================================
// Prepare Submissionボタンにクリックイベントリスナーを追加する
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { editor as monacoEditor } from "monaco-editor";

// ----------------------------------------------------------------
// AtCoder本来のソースコード欄にコードをセットする関数
// ----------------------------------------------------------------

const setSourceCode = (code: string) => {
    if (!document.querySelector("#sourceCode")) {
        console.error("[AIBP] #sourceCode element not found");
        return;
    }
    const sourceCodeElement = document.querySelector("#sourceCode") as HTMLElement;
    // #sourceCode の中には #editor(Ace Editor)と #plain-textarea(textarea)がある
    const aceEditorElement = document.querySelector("#sourceCode #editor") as HTMLElement;
    const plainTextareaElement = document.querySelector(
        "#sourceCode #plain-textarea",
    ) as HTMLTextAreaElement;
    if (!aceEditorElement || !plainTextareaElement) {
        console.error("[AIBP] #editor or #plain-textarea element not found inside #sourceCode");
        return;
    }
    // 今表示されているのはAce Editorか？
    const isAceEditorVisible = aceEditorElement.style.display !== "none";
    // Ace Editorが表示されている場合、ボタンを押してtextareaに切り替える
    const editorToggleButton = document.querySelector(".btn-toggle-editor") as HTMLElement;
    if (isAceEditorVisible) {
        editorToggleButton.click();
    }
    // この状態でPlain Textareaにコードをセットする
    plainTextareaElement.value = code;
    // Ace Editorが表示されていた場合、もう一度ボタンを押してAce Editorに戻す
    if (isAceEditorVisible) {
        editorToggleButton.click();
    }
    // ついでに、 #sourceCode までスクロール
    sourceCodeElement.scrollIntoView({
        behavior: "smooth",
    });
};

// ----------------------------------------------------------------
// コードに`dfs`と`Bun`が両方含まれているときに出す警告文章
// ----------------------------------------------------------------
const warningMessageOnDfsAndBun = `\
警告: Bun環境で再帰DFSをしようとしていませんか？コールスタック超過によりペナルティ(Runtime Error)を受ける可能性があります。続行しますか？
Warning: Are you trying to do recursive DFS in the Bun environment? You may get a penalty (Runtime Error) due to stack overflow. Do you want to proceed?
`;

// ----------------------------------------------------------------
// 本体
// Prepare Submissionボタンにクリックイベントリスナーを追加する関数
// ----------------------------------------------------------------

export const setupPrepareSubmissionButton = async (
    container: HTMLDivElement,
    editor: monacoEditor.IStandaloneCodeEditor,
) => {
    // ==== Prepare Submissionボタンにクリックイベントリスナーを追加 ====
    const prepareButton = container.querySelector(
        "#button-prepare-submission",
    ) as HTMLButtonElement;
    prepareButton.addEventListener("click", () => {
        // Monaco Editorからコードを取得
        const code = editor.getValue();
        // もしコードに`dfs`と`Bun`が両方含まれていたら、ダイアログで警告する
        if (code.includes("dfs") && code.includes("Bun")) {
            const proceed = window.confirm(warningMessageOnDfsAndBun);
            if (!proceed) {
                return;
            }
        }
        // AtCoderのソースコード欄にセットする
        setSourceCode(code);
    });
};
