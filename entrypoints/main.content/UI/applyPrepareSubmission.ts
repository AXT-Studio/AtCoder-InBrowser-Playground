import type { editor } from "monaco-editor";
import { focusTypeScriptError, prepareSubmission } from "@/utils/atcoder/prepareSubmission";

/** Prepare Submission ボタン共通処理 */
export const applyPrepareSubmission = (params: {
    code: string;
    language: string;
    editor: editor.IStandaloneCodeEditor | null;
}): void => {
    const result = prepareSubmission({
        code: params.code,
        language: params.language,
        editor: params.editor,
        confirm: (message) => window.confirm(message),
    });

    if (result.action === "blocked" && params.editor) {
        focusTypeScriptError(params.editor, result.marker);
    }
};
