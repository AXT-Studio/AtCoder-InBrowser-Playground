// ================================================================================================
// [Run Test]ボタンを押したときの動作を設定する
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { editor as monacoEditor } from "monaco-editor";
import { runTest } from "@/entrypoints/main.content/services/runTest";
import { getEditorLanguage } from "../../services/settings";

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
// ボタンクリック時に行う処理の各フェーズ
// (ここにある関数はすべてResultを返すようにしてエラーハンドリングをします。)
// ----------------------------------------------------------------

/** [Run Test]ボタンを無効化し、statusをWJにします。 */
const prepareForTestExecution = (
    statusSpan: HTMLSpanElement,
    execTimeTd: HTMLTableCellElement,
    runTestButton: HTMLButtonElement,
): Result<void, Error> => {
    try {
        runTestButton.disabled = true;
        updateTestStatus(statusSpan, "WJ");
        execTimeTd.textContent = "---";
        return { status: "success", details: undefined };
    } catch (error) {
        return { status: "failure", details: error as Error };
    }
};

// ----------------------------------------------------------------
// ボタンクリック時の処理本体
// ----------------------------------------------------------------

const onRunTestButtonClicked = async (
    statusSpan: HTMLSpanElement,
    execTimeTd: HTMLTableCellElement,
    testInputTextarea: HTMLTextAreaElement,
    expectedOutputTextarea: HTMLTextAreaElement,
    actualStdoutTextarea: HTMLTextAreaElement,
    actualStderrTextarea: HTMLTextAreaElement,
    timeLimitMs: number,
    allowableError: number,
    runTestButton: HTMLButtonElement,
    editor: monacoEditor.IStandaloneCodeEditor,
    selectedLanguage: string,
): Promise<Result<void, Error>> => {
    // ==== まずボタン自体を無効化し、statusをWJにする ====
    const prepareResult = prepareForTestExecution(statusSpan, execTimeTd, runTestButton);
    if (prepareResult.status === "failure") return prepareResult;
    // ==== stdout/stderr表示エリアをクリア ====
    updateOutputAreas(actualStdoutTextarea, actualStderrTextarea, "", "");

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
    runTestButton.disabled = false;
    return { status: "success", details: undefined };
};

// ----------------------------------------------------------------
// Run TestボタンにTest処理を追加する
// ----------------------------------------------------------------

export const setupRunTestButton = async (
    container: HTMLDivElement,
    editor: monacoEditor.IStandaloneCodeEditor,
) => {
    // ==== 先にStatus・Exec. Timeの要素を取得 ====
    const statusSpan = container.querySelector("#span-test-status") as HTMLSpanElement;
    const execTimeTd = container.querySelector("#td-execution-time") as HTMLTableCellElement;

    // ==== 先にtest inputとexpected outputの要素を取得 ====
    const testInputTextarea = container.querySelector(
        "#textarea-test-input",
    ) as HTMLTextAreaElement;
    const expectedOutputTextarea = container.querySelector(
        "#textarea-expected-output",
    ) as HTMLTextAreaElement;

    // ==== 先に実行時間制限・許容誤差の要素を取得 ====
    const timeLimitInput = container.querySelector(
        "#input-settings-test-time-limit",
    ) as HTMLInputElement;
    const timeMarginInput = container.querySelector(
        "#input-settings-allowable-error",
    ) as HTMLInputElement;

    // ==== stdout/stderr表示エリアの要素を取得 ====
    const actualStdoutTextarea = container.querySelector(
        "#textarea-actual-stdout",
    ) as HTMLTextAreaElement;
    const actualStderrTextarea = container.querySelector(
        "#textarea-actual-stderr",
    ) as HTMLTextAreaElement;

    // ==== Run Testボタンの要素を取得 ====
    const runTestButton = container.querySelector("#button-run-test") as HTMLButtonElement;

    // ==== ボタンにクリックイベントリスナーを追加 ====
    runTestButton.addEventListener("click", async () => {
        // ==== Languageの設定をbrowser.storage.localから取得 ====
        const selectedLanguage = (await getEditorLanguage()) || "plaintext";
        // 実行時間制限・許容誤差を取得
        const timeLimitMs = Number(timeLimitInput.value) || 1000;
        const allowableError = Number(timeMarginInput.value) || 0;
        // Run Test処理を実行
        await onRunTestButtonClicked(
            statusSpan,
            execTimeTd,
            testInputTextarea,
            expectedOutputTextarea,
            actualStdoutTextarea,
            actualStderrTextarea,
            timeLimitMs,
            allowableError,
            runTestButton,
            editor,
            selectedLanguage,
        );
    });
};
