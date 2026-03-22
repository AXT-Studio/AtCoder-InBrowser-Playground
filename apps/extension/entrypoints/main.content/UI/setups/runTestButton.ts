// ================================================================================================
// [Run Test]ボタンを押したときの動作を設定する
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { editor as monacoEditor } from "monaco-editor";
import type { Failure, Result, Success } from "./../../../../types/Result";

// ----------------------------------------------------------------
// 期待出力とstdoutが「一致」しているかを判定する関数
// 数値の場合は許容誤差を考慮して比較
// ----------------------------------------------------------------

const isOutputCorrect = (expected: string, actual: string, allowableError: number): boolean => {
    // 両方を改行・スペース区切りで2次元配列にする
    const expectedLines = expected
        .trim()
        .split("\n")
        .map((row) => row.trim().split(" "));
    const actualLines = actual
        .trim()
        .split("\n")
        .map((row) => row.trim().split(" "));
    // 行数・列数が異なる場合は不一致
    if (expectedLines.length !== actualLines.length) {
        return false;
    }
    // 各行・各要素ごとに比較
    for (let i = 0; i < expectedLines.length; i++) {
        const expectedRow = expectedLines[i];
        const actualRow = actualLines[i];
        if (expectedRow.length !== actualRow.length) {
            return false;
        }
        for (let j = 0; j < expectedRow.length; j++) {
            // 数値として比較可能かどうかをチェック
            const expectedValue = expectedRow[j];
            const actualValue = actualRow[j];
            const expectedNumber = Number(expectedValue);
            const actualNumber = Number(actualValue);
            const expectedIsNumber = !Number.isNaN(expectedNumber);
            const actualIsNumber = !Number.isNaN(actualNumber);
            if (expectedIsNumber && actualIsNumber) {
                // 両方数値の場合、許容誤差内かどうかをチェック
                if (Math.abs(expectedNumber - actualNumber) > allowableError) {
                    return false;
                }
            } else {
                // どちらかが数値でない場合、文字列として完全一致かどうかをチェック
                if (expectedValue !== actualValue) {
                    return false;
                }
            }
        }
    }
    return true;
};

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
        return { status: "success", data: undefined };
    } catch (error) {
        return { status: "failure", error: error as Error };
    }
};

// ----------------------------------------------------------------
// ボタンクリック時の処理本体
// ----------------------------------------------------------------

const runTest = async (
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
    // ==== Background Scriptに渡して実行を試みる try-catchでエラーハンドリング ====
    try {
        // ==== エディタからコードを取得 ====
        const code = editor.getValue();
        // ==== テスト入力と期待出力を取得 ====
        const testInput = testInputTextarea.value;
        const expectedOutput = expectedOutputTextarea.value;
        // ==== Background Scriptにテスト実行環境のセットアップを要求 (Environment Preparing Protocol) ====
        const prepareResponse = await new Promise<Result<void, Error>>((resolve) => {
            // 通信IDを生成
            const requestId = crypto.randomUUID();
            // 返ってくるnotify-readyかnotify-deniedを待つためのリスナーを先に作る
            const notifyListener = (message: any) => {
                console.log("Received setup response:", message);
                // notify-readyが返ってきたら成功
                if (message.type === "notify-ready" && message.payload.id === requestId) {
                    browser.runtime.onMessage.removeListener(notifyListener);
                    resolve({ status: "success", data: undefined });
                }
                // notify-deniedが返ってきたら失敗
                else if (message.type === "notify-denied" && message.payload.id === requestId) {
                    browser.runtime.onMessage.removeListener(notifyListener);
                    resolve({
                        status: "failure",
                        error: new Error(`Environment setup denied: ${message.payload.reason}`),
                    });
                }
            };
            // リスナーを登録
            browser.runtime.onMessage.addListener(notifyListener);
            // Background Scriptにrequest-prepareを送る
            browser.runtime.sendMessage({
                type: "request-prepare",
                payload: {
                    id: requestId,
                    language: selectedLanguage,
                },
            });
        });
        if (prepareResponse.status === "failure") {
            // ==== 環境のセットアップに失敗した場合はエラーメッセージを表示して終了 ====
            updateTestStatus(statusSpan, "RE");
            updateOutputAreas(
                actualStdoutTextarea,
                actualStderrTextarea,
                "",
                `Environment setup failed: ${prepareResponse.error.message}`,
            );
            return prepareResponse;
        }
        // ==== 現在の時刻を取得（実行時間計測用） ====
        const startTime = performance.now();
        // ==== Background Scriptに実行依頼を送信 ====
        type RunResult = Result<
            { stdout: string; stderr: string },
            { errorType: "TLE" | "RE" | "CE"; error: string }
        >;
        const runResponse = await new Promise<RunResult>((resolve) => {
            // 通信IDを生成
            const requestId = crypto.randomUUID();
            // 返ってくるnotify-resultを待つためのリスナーを先に作る
            const notifyListener = (message: any) => {
                console.log("Received run response:", message);
                if (message.type === "notify-result" && message.payload.id === requestId) {
                    console.log("Received run result:", message.payload.result);
                    browser.runtime.onMessage.removeListener(notifyListener);
                    resolve(message.payload.result);
                }
            };
            // リスナーを登録
            browser.runtime.onMessage.addListener(notifyListener);
            // Background Scriptにrequest-runを送る
            browser.runtime.sendMessage({
                type: "request-execute",
                payload: {
                    id: requestId,
                    code,
                    language: selectedLanguage,
                    stdin: testInput,
                    timeLimitMs: timeLimitMs * 1.1, // 実行時間制限の少し余裕を持たせて送る
                },
            });
        });
        // ==== 実行時間を計測 ====
        const endTime = performance.now();
        const execTime = endTime - startTime;
        // ==== stdoutが合ってるか確認 ====
        const isCorrect =
            runResponse.status === "success" &&
            isOutputCorrect(expectedOutput, runResponse.data.stdout, allowableError);
        // ==== 結果ステータスによって表示を分ける必要がないところは先に更新 ====
        updateOutputAreas(
            actualStdoutTextarea,
            actualStderrTextarea,
            runResponse.status === "success" ? runResponse.data.stdout : "",
            runResponse.status === "success" ? runResponse.data.stderr : runResponse.error.error,
        );
        updateExecutionTime(execTimeTd, execTime, timeLimitMs);
        if (execTime > timeLimitMs) {
            // ==== execTime・isCorrectに応じて場合分けして適切に結果を更新 ====
            // 実行時間が制限を超えている場合はTLE
            updateTestStatus(statusSpan, "TLE");
        } else if (runResponse.status === "failure") {
            // Failureが返ってきている場合、中身のerrorType(RE, CE, TLEがあり得る)を見て判断
            switch (runResponse.error.errorType) {
                case "TLE":
                    updateTestStatus(statusSpan, "TLE");
                    break;
                case "RE":
                    updateTestStatus(statusSpan, "RE");
                    break;
                case "CE":
                    updateTestStatus(statusSpan, "CE");
                    break;
                default:
                    updateTestStatus(statusSpan, "RE");
                    break;
            }
        } else if (isCorrect) {
            // stdoutが正しい場合はAC
            updateTestStatus(statusSpan, "AC");
        } else {
            // stdoutが正しくない場合はWA
            updateTestStatus(statusSpan, "WA");
        }
        // ==== 最後にRun Testボタンを有効化 ====
        runTestButton.disabled = false;
        // ==== すべて正常に終了したらsuccessを返す ====
        return { status: "success", data: undefined };
    } catch (error) {
        // ==== 予期せぬエラーが発生した場合はエラーメッセージを表示しボタンを有効化して終了 ====
        updateTestStatus(statusSpan, "RE");
        updateOutputAreas(
            actualStdoutTextarea,
            actualStderrTextarea,
            "",
            `Unexpected error: ${(error as Error).message}`,
        );
        runTestButton.disabled = false;
        return { status: "failure", error: error as Error };
    }
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
    // ==== Languageの設定をbrowser.storage.localから取得 ====
    const selectedLanguage =
        (await storage.getItem<string>("local:settings.editorLanguage")) || "plaintext";

    // ==== ボタンにクリックイベントリスナーを追加 ====
    runTestButton.addEventListener("click", async () => {
        // 実行時間制限・許容誤差を取得
        const timeLimitMs = Number(timeLimitInput.value) || 1000;
        const allowableError = Number(timeMarginInput.value) || 0;
        // Run Test処理を実行
        await runTest(
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
