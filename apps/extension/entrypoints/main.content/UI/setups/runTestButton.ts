// ================================================================================================
// [Run Test]ボタンを押したときの動作を設定する
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { editor as monacoEditor } from "monaco-editor";
import { runTest } from "@/entrypoints/main.content/services/runTest";
import { getEditorLanguage } from "@/entrypoints/main.content/services/settings";

// ----------------------------------------------------------------
// ボタンクリック時に頻発する処理
// ----------------------------------------------------------------
/** stdout, stderrのtextareaを更新します。nullの場合は更新しません。 */
const updateOutputAreas = (
    actualStdoutTextarea: HTMLTextAreaElement,
    actualStderrTextarea: HTMLTextAreaElement,
    stdout: string | null,
    stderr: string | null,
) => {
    if (stdout !== null) {
        actualStdoutTextarea.value = stdout;
    }
    if (stderr !== null) {
        actualStderrTextarea.value = stderr;
    }
};

/** Test Statusボタンを更新します。(色はstatusの内容から自動で設定します。) */
const updateTestStatus = (
    statusSpan: HTMLSpanElement,
    status: "AC" | "WA" | "TLE" | "RE" | "CE" | "WJ",
) => {
    statusSpan.textContent = status;
    switch (status) {
        case "AC":
            statusSpan.dataset.color = "green";
            break;
        case "WA":
            statusSpan.dataset.color = "red";
            break;
        case "TLE":
            statusSpan.dataset.color = "yellow";
            break;
        case "RE":
            statusSpan.dataset.color = "purple";
            break;
        case "CE":
            statusSpan.dataset.color = "purple";
            break;
        case "WJ":
            statusSpan.dataset.color = "gray";
            break;
    }
};

/** Exec. Time欄を更新します。ただし、指定された値が実行時間制限を超えている場合は`> XXX ms`のように表示します。 */
const updateExecutionTime = (
    execTimeTd: HTMLTableCellElement,
    execTime: number,
    timeLimitMs: number,
) => {
    if (execTime > timeLimitMs) {
        execTimeTd.textContent = `> ${timeLimitMs} ms`;
    } else {
        execTimeTd.textContent = `${execTime.toFixed(0)} ms`;
    }
};

// ----------------------------------------------------------------
// UIからテスト実行し、結果をDOMへ反映する
// ----------------------------------------------------------------

export type RunTestFromUIOptions = {
    stdin?: string;
    expected?: string;
};

/** コンテナ内のテストUIを読み取り、runTest serviceを呼んで結果を反映します。 */
export const runTestFromUI = async (
    container: HTMLDivElement,
    editor: monacoEditor.IStandaloneCodeEditor,
    options?: RunTestFromUIOptions,
): Promise<Result<void, Error>> => {
    const statusSpan = container.querySelector("#span-test-status") as HTMLSpanElement | null;
    const execTimeTd = container.querySelector("#td-execution-time") as HTMLTableCellElement | null;
    const testInputTextarea = container.querySelector(
        "#textarea-test-input",
    ) as HTMLTextAreaElement | null;
    const expectedOutputTextarea = container.querySelector(
        "#textarea-expected-output",
    ) as HTMLTextAreaElement | null;
    const timeLimitInput = container.querySelector(
        "#input-settings-test-time-limit",
    ) as HTMLInputElement | null;
    const timeMarginInput = container.querySelector(
        "#input-settings-allowable-error",
    ) as HTMLInputElement | null;
    const actualStdoutTextarea = container.querySelector(
        "#textarea-actual-stdout",
    ) as HTMLTextAreaElement | null;
    const actualStderrTextarea = container.querySelector(
        "#textarea-actual-stderr",
    ) as HTMLTextAreaElement | null;
    const runTestButton = container.querySelector("#button-run-test") as HTMLButtonElement | null;

    if (
        !statusSpan ||
        !execTimeTd ||
        !testInputTextarea ||
        !expectedOutputTextarea ||
        !timeLimitInput ||
        !timeMarginInput ||
        !actualStdoutTextarea ||
        !actualStderrTextarea ||
        !runTestButton
    ) {
        return {
            status: "failure",
            details: new Error("Required test UI elements not found"),
        };
    }

    if (runTestButton.disabled) {
        return { status: "success", details: undefined };
    }

    if (options?.stdin !== undefined) {
        testInputTextarea.value = options.stdin;
    }
    if (options?.expected !== undefined) {
        expectedOutputTextarea.value = options.expected;
    }

    try {
        runTestButton.disabled = true;
        updateTestStatus(statusSpan, "WJ");
        execTimeTd.textContent = "---";
        updateOutputAreas(actualStdoutTextarea, actualStderrTextarea, "", "");

        const selectedLanguage = (await getEditorLanguage()) || "plaintext";
        const timeLimitMs = Number(timeLimitInput.value) || 1000;
        const allowableError = Number(timeMarginInput.value) || 0;

        const result = await runTest({
            code: editor.getValue(),
            stdin: testInputTextarea.value,
            expected: expectedOutputTextarea.value,
            selectedLanguage,
            timeLimitMs,
            allowableError,
        });

        updateOutputAreas(actualStdoutTextarea, actualStderrTextarea, result.stdout, result.stderr);
        updateExecutionTime(execTimeTd, result.execTimeMs, timeLimitMs);
        updateTestStatus(statusSpan, result.verdict);
        return { status: "success", details: undefined };
    } catch (error) {
        return { status: "failure", details: error as Error };
    } finally {
        runTestButton.disabled = false;
    }
};

// ----------------------------------------------------------------
// Run TestボタンにTest処理を追加する
// ----------------------------------------------------------------

export const setupRunTestButton = async (
    container: HTMLDivElement,
    editor: monacoEditor.IStandaloneCodeEditor,
) => {
    const runTestButton = container.querySelector("#button-run-test") as HTMLButtonElement;
    runTestButton.addEventListener("click", async () => {
        await runTestFromUI(container, editor);
    });
};
