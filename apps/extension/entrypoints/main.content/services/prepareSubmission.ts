// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import {
    type editor as monacoEditor,
    editor as monacoEditorApi,
    MarkerSeverity,
} from "monaco-editor";

type ModelErrorMarker = ReturnType<typeof monacoEditorApi.getModelMarkers>[number];

// ----------------------------------------------------------------
// TypeScriptの型エラー（severity: Error）を先頭から1件取得する
// ----------------------------------------------------------------
export const getFirstTypeScriptErrorMarker = (
    model: monacoEditor.ITextModel,
): ModelErrorMarker | undefined => {
    const errorMarkers = monacoEditorApi
        .getModelMarkers({ resource: model.uri })
        .filter((m) => m.severity === MarkerSeverity.Error);
    if (errorMarkers.length === 0) {
        return undefined;
    }
    return errorMarkers.sort((a, b) => {
        if (a.startLineNumber !== b.startLineNumber) {
            return a.startLineNumber - b.startLineNumber;
        }
        return a.startColumn - b.startColumn;
    })[0];
};

// ----------------------------------------------------------------
// Submissionの提出準備をする
// ----------------------------------------------------------------
