/**
 * AtCoder の提出欄（Ace / textarea）へソースを転記する。
 */
export const setSourceCode = (code: string): void => {
    if (!document.querySelector("#sourceCode")) {
        console.error("[AIBP] #sourceCode element not found");
        return;
    }
    const sourceCodeElement = document.querySelector("#sourceCode") as HTMLElement;
    const aceEditorElement = document.querySelector("#sourceCode #editor") as HTMLElement;
    const plainTextareaElement = document.querySelector("#sourceCode #plain-textarea") as HTMLTextAreaElement;
    if (!aceEditorElement || !plainTextareaElement) {
        console.error("[AIBP] #editor or #plain-textarea element not found inside #sourceCode");
        return;
    }

    const isAceEditorVisible = aceEditorElement.style.display !== "none";
    const editorToggleButton = document.querySelector(".btn-toggle-editor") as HTMLElement;
    if (isAceEditorVisible) {
        editorToggleButton.click();
    }
    plainTextareaElement.value = code;
    if (isAceEditorVisible) {
        editorToggleButton.click();
    }
    sourceCodeElement.scrollIntoView({
        behavior: "smooth",
    });
};
