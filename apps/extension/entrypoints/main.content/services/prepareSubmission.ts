// ================================================================================================
// Prepare Submission のオーケストレーション
// ================================================================================================

import {
    type editor as monacoEditor,
    editor as monacoEditorApi,
    MarkerSeverity,
} from "monaco-editor";

export type ModelErrorMarker = ReturnType<typeof monacoEditorApi.getModelMarkers>[number];

export type PrepareSubmissionResult =
    | { action: "blocked"; marker: ModelErrorMarker }
    | { action: "confirm"; message: string }
    | { action: "submit" };

export const WARNING_MESSAGE_ON_DFS_AND_BUN = `\
警告: Bun環境で再帰DFSをしようとしていませんか？コールスタック超過によりペナルティ(Runtime Error)を受ける可能性があります。続行しますか？
Warning: Are you trying to do recursive DFS in the Bun environment? You may get a penalty (Runtime Error) due to stack overflow. Do you want to proceed?
`;

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

export const shouldWarnDfsAndBun = (code: string): boolean =>
    code.includes("dfs") && code.includes("Bun");

// ----------------------------------------------------------------
// 提出準備の可否を判定する
// ----------------------------------------------------------------

export const evaluatePrepareSubmission = (params: {
    code: string;
    model: monacoEditor.ITextModel | null;
}): PrepareSubmissionResult => {
    const { code, model } = params;

    if (model?.getLanguageId() === "typescript") {
        const firstError = getFirstTypeScriptErrorMarker(model);
        if (firstError) {
            return { action: "blocked", marker: firstError };
        }
    }

    if (shouldWarnDfsAndBun(code)) {
        return { action: "confirm", message: WARNING_MESSAGE_ON_DFS_AND_BUN };
    }

    return { action: "submit" };
};
