// ================================================================================================
// Example Auto-Exec.ボタン群を追加する
// ================================================================================================

import type { editor as monacoEditor } from "monaco-editor";
import { parseSampleCases } from "@/utils/atcoder/parse_samples";
import { runTestFromUI } from "./runTestButton";

// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------
export const setupExampleAutoExecButtons = async (
    container: HTMLDivElement,
    editor: monacoEditor.IStandaloneCodeEditor,
) => {
    // ==== 入力例・出力例のペアを取得 ====
    const samples = parseSampleCases();
    // ==== ボタンを生成 ====
    samples.names.forEach((sampleName) => {
        // inputとoutputが揃ってるか確認し、なければスキップ
        if (!samples.input.has(sampleName) || !samples.output.has(sampleName)) {
            return;
        }
        // ボタンを生成し、サンプルを適用してテスト実行する
        const buttonElement = document.createElement("button");
        buttonElement.classList.add("button-auto-exec");
        buttonElement.setAttribute("data-testcase", sampleName);
        buttonElement.textContent = sampleName;
        buttonElement.addEventListener("click", async () => {
            await runTestFromUI(container, editor, {
                stdin: samples.input.get(sampleName) ?? "",
                expected: samples.output.get(sampleName) ?? "",
            });
        });
        // まとめて #section-auto-exec-buttons に追加
        const buttonsContainer = container.querySelector(
            "#section-auto-exec-buttons",
        ) as HTMLDivElement | null;
        if (buttonsContainer) {
            buttonsContainer.appendChild(buttonElement);
        }
    });
};
