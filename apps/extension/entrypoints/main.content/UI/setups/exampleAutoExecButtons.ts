// ================================================================================================
// Example Auto-Exec.ボタン群を追加する
// ================================================================================================

import { parseSampleCases } from "@/utils/atcoder/parse_samples";

// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------
export const setupExampleAutoExecButtons = async (container: HTMLDivElement) => {
    // ==== 入力例・出力例のペアを取得 ====
    const samples = parseSampleCases();
    // ==== ボタンを生成 ====
    const buttonElements: HTMLButtonElement[] = [];
    samples.names.forEach((sampleName) => {
        // inputとoutputが揃ってるか確認し、なければスキップ
        if (!samples.input.has(sampleName) || !samples.output.has(sampleName)) {
            return;
        }
        // ボタンを生成し、Testcase input, outputをsetしてRunボタンを押す動作を設定
        const buttonElement = document.createElement("button");
        buttonElement.classList.add("button-auto-exec");
        buttonElement.setAttribute("data-testcase", sampleName);
        buttonElement.textContent = sampleName;
        buttonElements.push(buttonElement);
        buttonElement.addEventListener("click", () => {
            const testInputTextarea = container.querySelector(
                "#textarea-test-input",
            ) as HTMLTextAreaElement | null;
            const expectedOutputTextarea = container.querySelector(
                "#textarea-expected-output",
            ) as HTMLTextAreaElement | null;
            const runTestButton = container.querySelector(
                "#button-run-test",
            ) as HTMLButtonElement | null;
            if (!testInputTextarea || !expectedOutputTextarea || !runTestButton) {
                return;
            }
            testInputTextarea.value = samples.input.get(sampleName) ?? "";
            expectedOutputTextarea.value = samples.output.get(sampleName) ?? "";
            if (runTestButton.disabled === false) {
                runTestButton.click();
            }
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
