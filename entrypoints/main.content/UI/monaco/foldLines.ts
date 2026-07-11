import type { editor as monacoEditor } from "monaco-editor";

export type FoldLinePredicate = (lineText: string, lineNumber: number) => boolean;

const FOLDABLE_LANGUAGE_IDS = new Set(["typescript", "javascript"]);

/** 旧実装と同じ: 行頭（空白可）が `class` の行を折る */
export const isClassDeclarationLine: FoldLinePredicate = (lineText) => /^\s*class\b/.test(lineText);

/**
 * Monaco Editor の折りたたみユーティリティ。
 * setValue 直後は fold range が未計算のことがあるので、既定で少し遅延する。
 */
export const foldLines = (
    editor: monacoEditor.IStandaloneCodeEditor,
    predicate: FoldLinePredicate,
    options?: { delayMs?: number },
): void => {
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

/** Insert / 外部 setValue 向け: `class` 宣言行を折る */
export const foldClassDeclarations = (
    editor: monacoEditor.IStandaloneCodeEditor,
    options?: { delayMs?: number },
): void => {
    foldLines(editor, isClassDeclarationLine, options);
};
