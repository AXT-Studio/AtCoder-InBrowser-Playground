// ================================================================================================
// entrypoints/main.content/uiSetups/exampleAutoExec.ts
// Example Auto-Exec.ボタン群を追加する
// ================================================================================================
// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------
export const addExampleAutoExecButton = (container: HTMLDivElement) => {
    // ==== 入力例・出力例のペアを取得 ====
    const samples = {
        names: new Set<string>(),
        input: new Map<string, string>(),
        output: new Map<string, string>(),
    };
    const sampleElements = document.querySelectorAll(".lang-ja section:has(h3~pre)");
    sampleElements.forEach((section) => {
        const sampleH3Text = section.querySelector("h3")?.childNodes[0].textContent ?? "";
        const samplePreText = section.querySelector("pre")?.childNodes[0].textContent ?? "";
        if (sampleH3Text.startsWith("入力例 ")) {
            const sampleName = sampleH3Text.slice("入力例 ".length).trim();
            samples.names.add(sampleName);
            samples.input.set(sampleName, samplePreText);
        }
        if (sampleH3Text.startsWith("出力例 ")) {
            const sampleName = sampleH3Text.slice("出力例 ".length).trim();
            samples.names.add(sampleName);
            samples.output.set(sampleName, samplePreText);
        }
    });
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
            const testInputTextarea = container.querySelector("#textarea-test-input") as HTMLTextAreaElement | null;
            const expectedOutputTextarea = container.querySelector("#textarea-expected-output") as HTMLTextAreaElement | null;
            const runTestButton = container.querySelector("#button-run-test") as HTMLButtonElement | null;
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
        const buttonsContainer = container.querySelector("#section-auto-exec-buttons") as HTMLDivElement | null;
        if (buttonsContainer) {
            buttonsContainer.appendChild(buttonElement);
        }
    });
};
