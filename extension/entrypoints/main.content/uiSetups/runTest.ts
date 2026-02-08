// ================================================================================================
// entrypoints/main.content/uiSetups/runTest.ts
// [Run Test]ボタンを押したときの動作を設定する
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { editor as monacoEditor } from "monaco-editor";

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
) => {
    // ==== まずボタン自体を無効化し、statusをWJにする ====
    runTestButton.disabled = true;
    statusSpan.textContent = "WJ";
    statusSpan.dataset.color = "gray";
    execTimeTd.textContent = "---";
    // ==== stdout/stderr表示エリアをクリア ====
    actualStdoutTextarea.value = "";
    actualStderrTextarea.value = "";
    // ==== Background Scriptでの実行を試みる try-catchでエラーハンドリング ====
    try {
        // ==== エディタからコードを取得 ====
        const code = editor.getValue();
        // ==== テスト入力と期待出力を取得 ====
        const testInput = testInputTextarea.value;
        const expectedOutput = expectedOutputTextarea.value;
        console.log("Test Input:", testInput);
        console.log("Expected Output:", expectedOutput);
        // ==== Background Scriptにテスト実行環境のセットアップを要求 ====
        const setupResponse = await new Promise<{ language: string }>((resolve, reject) => {
            // IDをランダム生成
            const id = crypto.randomUUID();
            // 返ってくるtest-ready or test-errorを待つためのリスナーを登録
            const listener = async (message: any) => {
                console.log("Received setup response:", message);
                if (message.type === "test-ready" && message.payload.id === id) {
                    browser.runtime.onMessage.removeListener(listener);
                    resolve(message.payload);
                } else if (message.type === "test-error" && message.payload.id === id) {
                    browser.runtime.onMessage.removeListener(listener);
                    reject(new Error(message.payload.error));
                }
            };
            browser.runtime.onMessage.addListener(listener);
            // メッセージを送信
            browser.runtime.sendMessage({
                type: "test-setup",
                payload: {
                    id,
                    language: selectedLanguage,
                },
            });
        });
        if (setupResponse instanceof Error) {
            throw setupResponse;
        }
        // ==== 現在の時刻を取得（実行時間計測用） ====
        const startTime = performance.now();
        // ==== Background Scriptに実行依頼を送信 ====
        const testResult = await new Promise<{ stdout: string; stderr: string; exitCode: number; error?: string }>((resolve) => {
            // IDをランダム生成
            const id = crypto.randomUUID();
            // 返ってくるtest-result or test-errorを待つためのリスナーを登録
            const listener = async (
                message:
                    | { type: "test-result"; payload: { id: string; stdout: string; stderr: string; exitCode: number; error?: string } }
                    | { type: "test-error"; payload: { id: string; error: string } },
            ) => {
                if (message.type === "test-result" && message.payload.id === id) {
                    browser.runtime.onMessage.removeListener(listener);
                    resolve(message.payload);
                } else if (message.type === "test-error" && message.payload.id === id) {
                    browser.runtime.onMessage.removeListener(listener);
                    console.error(`Test error for id=${id}: ${message.payload.error}`);
                    resolve({ stdout: "", stderr: "", exitCode: 1, error: message.payload.error });
                }
            };
            browser.runtime.onMessage.addListener(listener);
            // メッセージを送信
            browser.runtime.sendMessage({
                type: "test-run",
                payload: {
                    id,
                    code,
                    language: setupResponse.language,
                    stdin: testInput,
                    timeLimitMs,
                },
            });
        });
        // ==== 実行時間を計測 ====
        const endTime = performance.now();
        const execTime = endTime - startTime;
        // ==== 場合分けして結果をUIに表示 ====
        if (testResult.stderr !== "" || testResult.error) {
            // stderrが出ている場合: Status = RE
            statusSpan.textContent = "RE";
            statusSpan.dataset.color = "purple";
            execTimeTd.textContent = `${execTime.toFixed(0)} ms`;
            // stderrを表示
            actualStderrTextarea.value = testResult.stderr + (testResult.error ? `\nError: ${testResult.error}` : "");
        } else if (testResult.exitCode === 9) {
            // TLEの場合: Status = TLE
            statusSpan.textContent = "TLE";
            statusSpan.dataset.color = "yellow";
            execTimeTd.textContent = `> ${timeLimitMs} ms`;
            // stdout, stderrがあれば表示
            actualStdoutTextarea.value = testResult.stdout;
            actualStderrTextarea.value = testResult.stderr;
        } else {
            // 正常終了の場合: 出力が期待出力と一致するかをチェック
            const isCorrect = isOutputCorrect(expectedOutput, testResult.stdout, allowableError);
            if (isCorrect) {
                statusSpan.textContent = "AC";
                statusSpan.dataset.color = "green";
            } else {
                statusSpan.textContent = "WA";
                statusSpan.dataset.color = "red";
            }
            execTimeTd.textContent = `${execTime.toFixed(0)} ms`;
            // stdout, stderrがあれば表示
            actualStdoutTextarea.value = testResult.stdout;
            actualStderrTextarea.value = testResult.stderr;
        }
        // ==== 最後にボタンを再度有効化 ====
        runTestButton.disabled = false;
    } catch (error) {
        console.error("Error during test execution:", error);
        // ==== エラー発生時はStatusをREにしてボタンを有効化 ====
        statusSpan.textContent = "RE";
        statusSpan.dataset.color = "purple";
        execTimeTd.textContent = "---";
        actualStderrTextarea.value = `Error during test execution: ${(error as Error)?.message}`;
        runTestButton.disabled = false;
    }
};

// ----------------------------------------------------------------
// Run TestボタンにTest処理を追加する
// ----------------------------------------------------------------

export const addRunTestListener = async (container: HTMLDivElement, editor: monacoEditor.IStandaloneCodeEditor) => {
    // ==== 先にStatus・Exec. Timeの要素を取得 ====
    const statusSpan = container.querySelector("#span-test-status") as HTMLSpanElement;
    const execTimeTd = container.querySelector("#td-execution-time") as HTMLTableCellElement;

    // ==== 先にtest inputとexpected outputの要素を取得 ====
    const testInputTextarea = container.querySelector("#textarea-test-input") as HTMLTextAreaElement;
    const expectedOutputTextarea = container.querySelector("#textarea-expected-output") as HTMLTextAreaElement;

    // ==== 先に実行時間制限・許容誤差の要素を取得 ====
    const timeLimitInput = container.querySelector("#input-settings-test-time-limit") as HTMLInputElement;
    const timeMarginInput = container.querySelector("#input-settings-allowable-error") as HTMLInputElement;

    // ==== stdout/stderr表示エリアの要素を取得 ====
    const actualStdoutTextarea = container.querySelector("#textarea-actual-stdout") as HTMLTextAreaElement;
    const actualStderrTextarea = container.querySelector("#textarea-actual-stderr") as HTMLTextAreaElement;

    // ==== Run Testボタンの要素を取得 ====
    const runTestButton = container.querySelector("#button-run-test") as HTMLButtonElement;
    // ==== Languageの設定をbrowser.storage.localから取得 ====
    const selectedLanguage = (await storage.getItem<string>("local:settings.editorLanguage")) || "plaintext";

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
