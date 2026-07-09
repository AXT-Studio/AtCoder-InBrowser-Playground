// ================================================================================================
// Prepare Submissionボタンにクリックイベントリスナーを追加する
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import { type editor as monacoEditor, Range } from "monaco-editor";

import { setSourceCode } from "@/utils/atcoder/submission";

import { type ModelErrorMarker, evaluatePrepareSubmission } from "../../services/prepareSubmission";

const ERROR_FLASH_DURATION_MS = 500;
const ERROR_FLASH_LINE_CLASS = "aibp-ts-error-flash-line";

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

    // ==== Prepare Submissionボタンにクリックイベントリスナーを追加 ====
    const prepareButton = container.querySelector(
        "#button-prepare-submission",
    ) as HTMLButtonElement;
    prepareButton.addEventListener("click", () => {
        const code = editor.getValue();
        const model = editor.getModel();
        const result = evaluatePrepareSubmission({ code, model });

        if (result.action === "blocked") {
            if (model) {
                focusTypeScriptError(model, result.marker);
            }
            return;
        }
        if (result.action === "confirm" && !window.confirm(result.message)) {
            return;
        }
        setSourceCode(code);
    });
};
