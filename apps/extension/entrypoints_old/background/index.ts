// ================================================================================================
// # entrypoints/background/index.ts
// Background ScriptのEntrypoint。
// 各言語向けのテスト実行環境のセットアップや、実際にテストを行う際のRunnerとのやりとりを担当する。
//
// ## 通信プロトコル (Content <--> Background)
// すべての通信はidを伴い、一連の通信をこのidで識別します。
// idは各プロトコル最初の通信を発する側が生成します。
//
// ### Environment Preparing Protocol
// - message C->B: "request-prepare" (payload: { id: string, language: string })
//     - 指定された言語向けのテスト実行Runnerの準備をBackgroundに要求する。
// - task B:
//     - 指定された言語のRunnerが存在しない場合は新たに立ち上げ、セットアップを行う。
//     - 指定された言語のRunnerの準備がすでに完了している場合はセットアップが完了しているものとみなす。
//         - 直前の実行でTLEしてterminateされている場合は立ち上げ直す必要があるので注意。
// - message: B->C: "notify-ready" (payload: { id: string, language: string })
//     - テスト実行Runnerの準備が完了した(している)ことをBackgroundに通知する。
// - message: B->C: "notify-denied" (payload: { id: string, language: string, error: string })
//     - テスト実行Runnerの準備ができないことをBackgroundに通知する。
//
// ### Test Execution Protocol
// - message C->B: "request-execute" (payload: { id: string, code: string, language: string, stdin: string, timeLimitMs: number })
//     - codeをlanguageとみなし、stdinを標準入力としてテストを実行するようBackgroundに要求する。
// - task B:
//     - 指定された言語のRunnerにcodeの実行とstdinの提供を指示する。
//     - Runnerからの結果を待ち、Contentに返す。
//     - ただし、TLEの場合はRunnerをterminateしTLEを返す。
//         - 注: Runnerは次のtest-run要求時に新たに立ち上げられるので、terminateするだけでよい。
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
// ## Runner Moduleの使用方法
// ### 初期化
// - Runner Moduleは、その言語のコード実行に必要なオブジェクトを生成するinit関数をexportする。
//     - (init関数はPromiseでRunnerContextを返す。)
// - Background Scriptは、準備要求時にこのinit関数を呼び出し、戻り値を言語名に紐づけて保存する。
//
// ### コード実行
// - Runner Moduleは、コードを実行するrun関数をexportする。
//     - (run関数はPromiseでRunnerResultを返す。)
// - Background Scriptは、実行要求時に保存してあるinitの戻り値(RunnerContext)とコード、標準入力をrun関数に渡し、コードの実行を行う。
// - run関数は、コードの実行結果をResult型で返す。
//
// ## 注意点
// - initが返すContextは、同じ言語の複数回のコード実行要求で共有される。
//     - Runner Module側はそれを前提として設計すべきだし、Background Script側もそのように扱うべき。
//     - ただし、コード実行が失敗した(TLE, CE, RE)場合は、現在のContextは破棄して次の要求時にinitし直す。
//         - Runner Module側は、正常実行の繰り返しは処理できるべきだが、失敗したコード実行の後の再初期化は処理できなくてもよい。Background Script側で対応する。
// - run()について、TLE検知の実装をRunner Module側で行う必要はない。
//     - Background Script側で、run()のPromiseと実行時間制限のPromiseをraceさせる形でTLEを検知する。
//         - さらに、TLEの場合はAbortControllerなどを用いてrun()側の処理を強制終了する。
//     - run()はコードの実行に集中し、実行結果を返すことに専念すればよい。
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

/** biome-ignore-all assist/source/organizeImports: Module importを分けて書きたいのでignore */
import type { Runner, RunnerContext } from "./runners/types";

// 他の言語のModuleも将来的にここに追加
import PlaintextModule from "./runners/plaintext/index";
import TypeScriptModule from "./runners/typescript/index";
import PythonModule from "./runners/python/index";

// ----------------------------------------------------------------
// types
// ----------------------------------------------------------------

/** Test Execution Protocolのnotify-resultで使用する型 */
type TestExecutionProtocolResult = Result<
    { stdout: string; stderr: string },
    { errorType: "TLE" | "RE" | "CE"; error: string }
>;

type ChromeGlobalWithOffscreen = typeof globalThis & {
    chrome?: {
        offscreen?: {
            closeDocument: () => Promise<void>;
        };
    };
};

const closeMv3PythonOffscreenDocument = async (): Promise<void> => {
    if (import.meta.env.MANIFEST_VERSION !== 3) {
        return;
    }
    const chromeGlobal = globalThis as ChromeGlobalWithOffscreen;
    const closeDocument = chromeGlobal.chrome?.offscreen?.closeDocument;
    if (!closeDocument) {
        return;
    }
    try {
        await closeDocument();
    } catch (error) {
        console.warn("Failed to close offscreen document:", error);
    }
};

// ----------------------------------------------------------------
// 本体 (background script)
// ----------------------------------------------------------------

export default defineBackground({
    main() {
        console.log("Background script is started.");
        // ----------------------------------------------------------------
        // 各言語向けのModuleの管理
        // ----------------------------------------------------------------
        /** Runner Moduleのリスト */
        const runnerModules: Record<
            string,
            // biome-ignore lint/suspicious/noExplicitAny: どの言語のRunnerも来る可能性があるのでanyで受ける
            { init: () => Promise<RunnerContext>; run: Runner<any> }
        > = {
            plaintext: PlaintextModule,
            javascript: TypeScriptModule,
            typescript: TypeScriptModule,
            python: PythonModule,
        };

        /** Runner Contextのリスト (initしたらここに保存) */
        const runnerContexts: Record<string, RunnerContext> = {};

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
                const runnerModule = runnerModules[language];
                if (!runnerModule) {
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
                // ==== すでにContextが存在する場合はすぐにnotify-readyを返す ====
                if (runnerContexts[language]) {
                    await browser.tabs.sendMessage(tabId, {
                        type: "notify-ready",
                        payload: {
                            id,
                            language,
                        },
                    });
                    return;
                }
                // ==== 新しいContextを生成する ====
                console.log(`Initializing Runner Context for language=${language}`);
                try {
                    const context = await runnerModule.init();
                    runnerContexts[language] = context;
                } catch (error) {
                    console.error(
                        `Failed to initialize Runner Context for language=${language}:`,
                        error,
                    );
                    await browser.tabs.sendMessage(tabId, {
                        type: "notify-denied",
                        payload: {
                            id,
                            language,
                            error: `Failed to initialize Runner Context: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    });
                    return;
                }
                // ==== Contextの準備ができたらnotify-readyを返す ====
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
                // ==== 対応するContextが存在しない場合はエラーを返す ====
                const runnerModule = runnerModules[language];
                const runnerContext = runnerContexts[language];
                if (!runnerModule || !runnerContext) {
                    console.error(
                        `No Runner Context available for language=${language} in request-execute.`,
                    );
                    await browser.tabs.sendMessage(tabId, {
                        type: "notify-result",
                        payload: {
                            id,
                            result: {
                                status: "failure",
                                details: {
                                    errorType: "RE",
                                    error: `No Runner Context available for language: ${language}`,
                                },
                            },
                        },
                    });
                    return;
                }
                const run = runnerModule.run;
                // ==== 実行に時間がかかる場合に強制終了するために、race用のtimeout Promiseを生成 ====
                const timeoutPromise = new Promise<TestExecutionProtocolResult>((resolve) => {
                    setTimeout(() => {
                        resolve({
                            status: "failure",
                            details: {
                                errorType: "TLE",
                                error: "Execution time limit exceeded.",
                            },
                        });
                    }, timeLimitMs);
                });
                // ==== Runnerにコードの実行を指示 ====
                const runPromise = run({
                    context: runnerContext,
                    code,
                    stdin,
                });
                // ==== raceして結果を待つ ====
                const result = await Promise.race([runPromise, timeoutPromise]);
                // ==== 結果をContentに返す ====
                await browser.tabs.sendMessage(tabId, {
                    type: "notify-result",
                    payload: {
                        id,
                        result,
                    },
                });
                // ==== エラー(TLE, RE, CE)の場合はContextを破棄する ====
                if (result.status === "failure") {
                    console.warn(
                        `Execution failed (${result.details.errorType}) for id=${id}. Discarding Runner Context for language=${language}.`,
                    );
                    delete runnerContexts[language];
                    if (language === "python") {
                        await closeMv3PythonOffscreenDocument();
                    }
                }
            }
        });
    },
});
