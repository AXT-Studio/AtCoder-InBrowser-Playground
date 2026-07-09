// ================================================================================================
// Prepare Submissionボタンにクリックイベントリスナーを追加する
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import {
    type editor as monacoEditor,
    editor as monacoEditorApi,
    MarkerSeverity,
    Range,
} from "monaco-editor";

import { setSourceCode } from "@/utils/atcoder/submission";

type ModelErrorMarker = ReturnType<typeof monacoEditorApi.getModelMarkers>[number];

const ERROR_FLASH_DURATION_MS = 500;
const ERROR_FLASH_LINE_CLASS = "aibp-ts-error-flash-line";

// ----------------------------------------------------------------
// TypeScriptの型エラー（severity: Error）を先頭から1件取得する
// ----------------------------------------------------------------

const getFirstTypeScriptErrorMarker = (
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
// マーカー座標をモデル内に収める
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// 本体
// Prepare Submissionボタンにクリックイベントリスナーを追加する関数
// ----------------------------------------------------------------

export const setupPrepareSubmissionButton = async (
    container: HTMLDivElement,
    editor: monacoEditor.IStandaloneCodeEditor,
) => {
    const errorFlashDecorations = editor.createDecorationsCollection([]);
    let errorFlashTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const clearErrorFlash = () => {
        if (errorFlashTimeoutId !== undefined) {
            clearTimeout(errorFlashTimeoutId);
            errorFlashTimeoutId = undefined;
        }
        errorFlashDecorations.clear();
    };

    const flashErrorLines = (model: monacoEditor.ITextModel, marker: ModelErrorMarker) => {
        clearErrorFlash();
        errorFlashDecorations.set([
            {
                range: markerToFlashLineRange(model, marker),
                options: {
                    isWholeLine: true,
                    className: ERROR_FLASH_LINE_CLASS,
                },
            },
        ]);
        errorFlashTimeoutId = setTimeout(() => {
            errorFlashTimeoutId = undefined;
            errorFlashDecorations.clear();
        }, ERROR_FLASH_DURATION_MS);
    };

    // 転記拒否時: エラー範囲へスクロール・選択・行フラッシュ
    const focusTypeScriptError = (model: monacoEditor.ITextModel, marker: ModelErrorMarker) => {
        const errorRange = markerToSelectionRange(model, marker);
        editor.setSelection(errorRange);
        editor.revealRangeInCenter(errorRange);
        flashErrorLines(model, marker);
        editor.focus();
    };

    // ----------------------------------------------------------------
    // コードに`dfs`と`Bun`が両方含まれているときに出す警告文章
    // ----------------------------------------------------------------
    const warningMessageOnDfsAndBun = `\
警告: Bun環境で再帰DFSをしようとしていませんか？コールスタック超過によりペナルティ(Runtime Error)を受ける可能性があります。続行しますか？
Warning: Are you trying to do recursive DFS in the Bun environment? You may get a penalty (Runtime Error) due to stack overflow. Do you want to proceed?
`;

    // ==== Prepare Submissionボタンにクリックイベントリスナーを追加 ====
    const prepareButton = container.querySelector(
        "#button-prepare-submission",
    ) as HTMLButtonElement;
    prepareButton.addEventListener("click", () => {
        // Monaco Editorからコードを取得
        const code = editor.getValue();
        const model = editor.getModel();
        // TypeScriptのときのみ、型エラーがあれば転記を拒否してエラー位置へ移動
        if (model?.getLanguageId() === "typescript") {
            const firstError = getFirstTypeScriptErrorMarker(model);
            if (firstError) {
                focusTypeScriptError(model, firstError);
                return;
            }
        }
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
