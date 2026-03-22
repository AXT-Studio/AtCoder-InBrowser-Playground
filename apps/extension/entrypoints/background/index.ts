// ================================================================================================
// # entrypoints/background/index.ts
// Background ScriptのEntrypoint。
// 各言語向けのテスト実行環境のセットアップや、実際にテストを行う際のWorkerとのやりとりを担当する。
//
// ## 通信プロトコル (Content <--> Background)
// すべての通信はidを伴い、一連の通信をこのidで識別します。
// idは各プロトコル最初の通信を発する側が生成します。
//
// ### Environment Preparing Protocol
// - message C->B: "request-prepare" (payload: { id: string, language: string })
//     - 指定された言語向けのテスト実行Workerの準備をBackgroundに要求する。
// - task B:
//     - 指定された言語のWorkerが存在しない場合は新たに立ち上げ、セットアップを行う。
//     - 指定された言語のWorkerがすでに存在する場合はセットアップが完了しているものとみなす。
//         - 直前の実行でTLEしてterminateされている場合は立ち上げ直す必要があるので注意。
// - message: B->C: "notify-ready" (payload: { id: string, language: string })
//     - テスト実行Workerの準備が完了した(している)ことをBackgroundに通知する。
// - message: B->C: "notify-denied" (payload: { id: string, language: string, error: string })
//     - テスト実行Workerの準備ができないことをBackgroundに通知する。
//
// ### Test Execution Protocol
// - message C->B: "request-execute" (payload: { id: string, code: string, language: string, stdin: string, timeLimitMs: number })
//     - codeをlanguageとみなし、stdinを標準入力としてテストを実行するようBackgroundに要求する。
// - task B:
//     - 指定された言語のWorkerにcodeの実行とstdinの提供を指示する。
//     - Workerからの結果を待ち、Contentに返す。
//     - ただし、TLEの場合はWorkerをterminateしTLEを返す。
//         - 注: Workerは次のtest-run要求時に新たに立ち上げられるので、terminateするだけでよい。
// - message B->C: "notify-result" (payload: { id: string, result: Result<{stdout: string, stderr: string}, {errorType: "TLE" | "RE" | "CE", error: string}> })
//     - テスト実行の結果をContentに返す。
//     - resultはResult型で、以下のいずれかの形をとる。
//     - テストが正常に終了した場合、Success<{stdout: string, stderr: string}>を返す。
//         - stdoutは標準出力の内容、stderrは標準エラー出力の内容を表す。
//     - テストが正常に終了できなかった場合、Failure<{errorType: "TLE" | "RE" | "CE", error: string}>を返す。
//         - errorTypeはエラーの種類を表す。
//             - request-runで与えられた実行時間制限を超えた場合は"TLE"。
//             - プログラムのコンパイルに失敗した場合は"CE"。
//             - それ以外の実行時エラーが発生した場合は"RE"。
//         - errorはエラーの内容を表す。
//             - TLEの場合は"Time Limit Exceeded"などのわかりやすい文言を返す。
//             - CE/REの場合はコンパイルエラーや実行時エラーの内容を含む文字列を返す。
//
// ## 通信プロトコル (Background <--> Worker)
// すべての通信はidを伴い、一連の通信をこのidで識別します。
// idは各プロトコル最初の通信を発する側が生成します。
//
// ### Worker Initialization Protocol
// - message W->B: "notify-initialized" (payload: { id: string, language: string })
//     - Workerの初期化が完了し、コード実行を開始する用意ができたことをBackgroundに通知する。
//
// ### Worker Run Protocol
// - message B->W: "request-run" (payload: { id: string, code: string, stdin: string })
//     - stdinを標準入力として、codeを実行するようWorkerに指示する。
// - task W:
//     - codeを実行し、stdinを標準入力として与える。実行の完了を待つ。
//         - 注: 実行時間制限はBackground側で管理するので、Worker側ではコードの実行に集中して良い。
// - message W->B: "notify-output" (payload: { id: string, result: Result<{stdout: string, stderr: string}, {errorType: "TLE" | "RE" | "CE", error: string}> })
//     - テスト実行の結果をBackgroundに返す。
//     - resultはResult型で、以下のいずれかの形をとる。
//     - テストが正常に終了した場合、Success<{stdout: string, stderr: string}>を返す。
//         - stdoutは標準出力の内容、stderrは標準エラー出力の内容を表す。
//     - テストが正常に終了できなかった場合、Failure<{errorType: "TLE" | "RE" | "CE", error: string}>を返す。
//         - errorTypeはエラーの種類を表す。
//             - Backgroundからのrequest-runで与えられた実行時間制限を超えた場合は"TLE"。
//             - プログラムのコンパイルに失敗した場合は"CE"。
//             - それ以外の実行時エラーが発生した場合は"RE"。
//         - errorはエラーの内容を表す。
//             - TLEの場合は"Time Limit Exceeded"などのわかりやすい文言を返す。
//             - CE/REの場合はコンパイルエラーや実行時エラーの内容を含む文字列を返す。
//
// ## 注意点
// - Workerは各言語ごとに1つ。複数回の実行リクエストを受け取った場合でも同じWorkerを使い回す。
//     - Workerは複数回のWorker Run Protocolに対応できるように設計すること。
//     - ただし、同時に複数のWorker Run Protocolが走ることはないと仮定して良い。
// - Environment Preparing Protocolは同じ言語の2回目以降の実行でも呼び出される。
//     - "notify-ready"は実行可能であることを保証するものであって、必ずしも新たなWorkerの立ち上げを伴うものではなくてよい。
// - TLE時は、Background ScriptがWorkerをterminateし破棄する。
//     - Workerは次の実行リクエスト時に新たに立ち上げられるので、terminateするだけでよい。
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { Result } from "./../../types/Result";

import PlaintextWorker from "./workers/plaintext/worker?worker";
import TypescriptWorker from "./workers/typescript/worker?worker";
// 他の言語のWorkerも将来的にここに追加

export default defineBackground({
    main() {
        console.log("Background script is started.");
        // ----------------------------------------------------------------
        // 各言語向けのWorkerの管理
        // ----------------------------------------------------------------
        /** Runner Workerのコンストラクタ */
        const workerConstructors: Record<string, new () => Worker> = {
            plaintext: PlaintextWorker,
            javascript: TypescriptWorker,
            typescript: TypescriptWorker,
            // python: PythonWorker,
            // ruby: RubyWorker,
        };

        /** 起動されたWorkerを保管しておく。キーは言語名 */
        const workers: Map<string, Worker> = new Map();

        // ----------------------------------------------------------------
        // プロトコルごとのメッセージハンドラの登録
        // ----------------------------------------------------------------
        // ==== Environment Preparing Protocol (Worker Initialization Protocol) ====
        browser.runtime.onMessage.addListener(async (message, sender) => {
            if (message.type === "request-prepare") {
                const { id, language } = message.payload;
                console.log(
                    `[Background] Received request-prepare: id=${id}, language=${language}`,
                );
                // ==== Ensure sender tab exists ====
                const tabId = sender.tab?.id;
                if (!tabId) {
                    console.error("Received `request-prepare` from a sender without a tab ID.");
                    return;
                }
                // ==== 未対応言語の場合はエラーを返す ====
                const WorkerConstructor = workerConstructors[language];
                if (!WorkerConstructor) {
                    console.error(`Unsupported language in request-prepare: ${language}`);
                    await browser.tabs.sendMessage(tabId, {
                        type: "notify-denied",
                        payload: {
                            id,
                            language,
                            error: `Unsupported language: ${language}`,
                        },
                    });
                    return;
                }
                // ==== すでにWorkerが存在する場合はすぐにnotify-readyを返す ====
                if (workers.has(language)) {
                    await browser.tabs.sendMessage(tabId, {
                        type: "notify-ready",
                        payload: {
                            id,
                            language,
                        },
                    });
                    return;
                }
                // ==== 新しいWorkerを生成し、Workerからのnotify-initializedを待つ ====
                console.log(`Creating new Worker for language=${language}`);
                const worker = new WorkerConstructor();
                const workerReadyPromise = new Promise<void>((resolve) => {
                    worker.addEventListener("message", (event) => {
                        const workerMessage = event.data;
                        if (workerMessage.type === "notify-initialized") {
                            console.log(`Worker for language=${language} is ready.`);
                            resolve();
                        }
                    });
                });
                workers.set(language, worker);
                await workerReadyPromise;
                // ==== Workerの準備ができたらnotify-readyを返す ====
                await browser.tabs.sendMessage(tabId, {
                    type: "notify-ready",
                    payload: {
                        id,
                        language,
                    },
                });
            }
        });

        // ==== Test Execution Protocol (Worker Run Protocol) ====
        browser.runtime.onMessage.addListener(async (message, sender) => {
            if (message.type === "request-execute") {
                const { id, code, language, stdin, timeLimitMs } = message.payload;
                console.log(
                    `[Background] Received request-execute: id=${id}, language=${language}, code=${code}, stdin=${stdin}, timeLimitMs=${timeLimitMs}`,
                );
                // ==== Ensure sender tab exists ====
                const tabId = sender.tab?.id;
                if (!tabId) {
                    console.error("Received `request-execute` from a sender without a tab ID.");
                    return;
                }
                // ==== 対応するWorkerが存在しない場合はエラーを返す ====
                const worker = workers.get(language);
                if (!worker) {
                    console.error(
                        `No Worker available for language=${language} in request-execute.`,
                    );
                    await browser.tabs.sendMessage(tabId, {
                        type: "notify-result",
                        payload: {
                            id,
                            result: {
                                status: "failure",
                                data: {
                                    errorType: "RE",
                                    error: `No Worker available for language: ${language}`,
                                },
                            },
                        },
                    });
                    return;
                }
                // ==== Workerにコードの実行を指示、同時に実行時間制限でtimeoutするPromiseを立ててrace ====
                type RaceResult = Result<
                    { stdout: string; stderr: string },
                    { errorType: "TLE" | "RE" | "CE"; error: string }
                >;
                const workerRunPromise = new Promise<RaceResult>((resolve) => {
                    const onMessageListener = (event: MessageEvent) => {
                        const workerMessage = event.data;
                        if (
                            workerMessage.type === "notify-output" &&
                            workerMessage.payload.id === id
                        ) {
                            console.log(
                                `Received notify-output from Worker for id=${id}:`,
                                workerMessage.payload.result,
                            );
                            worker.removeEventListener("message", onMessageListener);
                            resolve(workerMessage.payload.result);
                        }
                    };
                    worker.addEventListener("message", onMessageListener);
                });
                const timeoutPromise = new Promise<RaceResult>((resolve) => {
                    setTimeout(() => {
                        resolve({
                            status: "failure",
                            error: {
                                errorType: "TLE",
                                error: "Execution time limit exceeded.",
                            },
                        });
                    }, timeLimitMs);
                });
                const racePromise = Promise.race([workerRunPromise, timeoutPromise]);
                // ==== Workerにコードの実行を指示 ====
                worker.postMessage({
                    type: "request-run",
                    payload: {
                        id,
                        code,
                        stdin,
                    },
                });
                // ==== 結果を待つ ====
                const result = await racePromise;
                // ==== TLEの場合はWorkerをterminateし、Mapから削除する ====
                if (result.status === "failure" && result.error.errorType === "TLE") {
                    console.warn(
                        `Execution timed out for id=${id}. Terminating Worker for language=${language}.`,
                    );
                    worker.terminate();
                    workers.delete(language);
                }
                // ==== 結果をContentに返す ====
                await browser.tabs.sendMessage(tabId, {
                    type: "notify-result",
                    payload: {
                        id,
                        result,
                    },
                });
            }
        });
    },
});
