import {
    type editor as monacoEditor,
    editor as monacoEditorApi,
    MarkerSeverity,
    Range,
} from "monaco-editor";
import { WARNING_MESSAGE_ON_DFS_AND_BUN, shouldWarnDfsAndBun } from "./prepareSubmissionGuards";
import { setSourceCode } from "./setSourceCode";

export type ModelErrorMarker = ReturnType<typeof monacoEditorApi.getModelMarkers>[number];

export type PrepareSubmissionResult =
    | { action: "blocked"; marker: ModelErrorMarker }
    | { action: "cancelled" }
    | { action: "submitted" };

export { WARNING_MESSAGE_ON_DFS_AND_BUN, shouldWarnDfsAndBun } from "./prepareSubmissionGuards";

const ERROR_FLASH_DURATION_MS = 500;
const ERROR_FLASH_LINE_CLASS = "aibp-ts-error-flash-line";

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

const clampColumn = (model: monacoEditor.ITextModel, lineNumber: number, column: number) =>
    Math.min(Math.max(1, column), model.getLineMaxColumn(lineNumber));

const markerToSelectionRange = (model: monacoEditor.ITextModel, marker: ModelErrorMarker) =>
    new Range(
        marker.startLineNumber,
        clampColumn(model, marker.startLineNumber, marker.startColumn),
        marker.endLineNumber,
        clampColumn(model, marker.endLineNumber, marker.endColumn),
    );

const markerToFlashLineRange = (model: monacoEditor.ITextModel, marker: ModelErrorMarker) =>
    new Range(
        marker.startLineNumber,
        1,
        marker.endLineNumber,
        model.getLineMaxColumn(marker.endLineNumber),
    );

/**
 * Prepare Submission の可否判定と転記。
 * TypeScript の型エラー検査は、提出用コードを表示中の Monaco があるときだけ行う
 * （Compare / Stress では提出用エディタが unmount されるためスキップ）。
 */
export const prepareSubmission = (params: {
    code: string;
    language: string;
    editor: monacoEditor.IStandaloneCodeEditor | null;
    confirm?: (message: string) => boolean;
}): PrepareSubmissionResult => {
    const confirm = params.confirm ?? ((message) => window.confirm(message));
    const model = params.editor?.getModel() ?? null;
    const canCheckTypescript =
        params.language === "typescript" &&
        model?.getLanguageId() === "typescript" &&
        params.editor?.getValue() === params.code;

    if (canCheckTypescript && model) {
        const firstError = getFirstTypeScriptErrorMarker(model);
        if (firstError) {
            return { action: "blocked", marker: firstError };
        }
    }

    if (shouldWarnDfsAndBun(params.code) && !confirm(WARNING_MESSAGE_ON_DFS_AND_BUN)) {
        return { action: "cancelled" };
    }

    setSourceCode(params.code);
    return { action: "submitted" };
};

/** 転記拒否時: エラー範囲へスクロール・選択・行フラッシュ */
export const focusTypeScriptError = (
    editor: monacoEditor.IStandaloneCodeEditor,
    marker: ModelErrorMarker,
): void => {
    const model = editor.getModel();
    if (!model) return;

    const errorRange = markerToSelectionRange(model, marker);
    editor.setSelection(errorRange);
    editor.revealRangeInCenter(errorRange);
    editor.focus();

    const decorations = editor.createDecorationsCollection([
        {
            range: markerToFlashLineRange(model, marker),
            options: {
                isWholeLine: true,
                className: ERROR_FLASH_LINE_CLASS,
            },
        },
    ]);
    setTimeout(() => {
        decorations.clear();
    }, ERROR_FLASH_DURATION_MS);
};
