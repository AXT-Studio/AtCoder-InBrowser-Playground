// ================================================================================================
// Monaco Editor の折りたたみユーティリティ
// ================================================================================================

import type { editor as monacoEditor } from "monaco-editor";

export type FoldLinePredicate = (lineText: string, lineNumber: number) => boolean;

const FOLDABLE_LANGUAGE_IDS = new Set(["typescript", "javascript"]);

// ----------------------------------------------------------------
// 折りたたみ処理
// ----------------------------------------------------------------

export const foldLines = (
    editor: monacoEditor.IStandaloneCodeEditor,
    predicate: FoldLinePredicate,
    options?: { delayMs?: number },
) => {
    const delayMs = options?.delayMs ?? 150;

    setTimeout(() => {
        const model = editor.getModel();
        if (!model) return;

        const languageId = model.getLanguageId();
        if (!FOLDABLE_LANGUAGE_IDS.has(languageId)) return;

        const selectionLines: number[] = [];
        for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
            if (predicate(model.getLineContent(lineNumber), lineNumber)) {
                // Monaco の selectionLines は 0-based
                selectionLines.push(lineNumber - 1);
            }
        }

        for (const line of selectionLines) {
            editor.trigger("aibp", "editor.fold", { selectionLines: [line] });
        }
    }, delayMs);
};
