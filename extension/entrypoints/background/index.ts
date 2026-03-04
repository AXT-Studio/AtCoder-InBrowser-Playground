// ================================================================================================
// # entrypoints/background/index.ts
// Background ScriptのEntrypoint。
// 各言語向けのテスト実行環境のセットアップや、実際にテストを行う際のWorkerとのやりとりを担当する。
//
// ## 通信プロトコル (Content <--> Background)
// - Content -> Background: message "test-setup" (payload: { id: string, language: string })
//     - 指定された言語向けのテスト実行環境をセットアップする。
// - Background -> Content: message "test-ready" (payload: { id: string, language: string })
//     - テスト実行環境のセットアップが完了した(している)ことをContentに通知する。idはsetupと同じ。
// - Content -> Background: message "test-run" (payload: { id: string, code: string, language: string, stdin: string, timeLimitMs: number })
//     - codeをlanguageとみなし、stdinを標準入力としてテストを実行し、結果をContentに返す。
// - Background -> Content: message "test-result" (payload: { id: string, stdout: string, stderr: string, exitCode: number, error?: string })
//     - テスト実行の結果(標準出力、標準エラー出力、終了コード、エラー情報)をContentに返す。idはtestと同じ。
// - Background -> Content: message "test-error" (payload: { id: string, error: string })
//     - 各種エラー情報をContentに返す。idはsetup/testと同じ。
//
// ## 通信プロトコル (Background <--> Worker)
// - Worker -> Background: message "worker-ready" (payload: { language: string })
//     - Workerの初期化が完了したことをBackgroundに通知する。
// - Background -> Worker: message "worker-run" (payload: { code: string, stdin: string })
//     - codeを実行し、stdinを標準入力として与えるようWorkerに指示する。
// - Worker -> Background: message "worker-result" (payload: { stdout: string, stderr: string, exitCode: number })
//     - テスト実行の結果(標準出力、標準エラー出力、終了コード)をBackgroundに返す。
// - Worker -> Background: message "worker-error" (payload: { error: string })
//     - 各種エラー情報をBackgroundに返す。
//
// ## 注意点
// - Workerは各言語ごとに1つ。複数回test-runを受け取った場合でも同じWorkerを使い回す。
//     - test-runは複数回呼び出される可能性がある。
//     - ただし、同時並行で2つ以上のtest-runが走ることはない。
//     - Workerは複数回のworker-runに対応できるように設計する。
// - test-setupは2回目以降の実行でも呼び出される。
//     - test-setupが呼び出されたとき、すでにその言語向けのWorkerが存在していれば、すぐにtest-readyを返してよい。
// - TLE時は、Background ScriptがWorkerをterminateし、新しいWorkerを立ち上げる。
//     - これにより、次のtest-run呼び出し時には新しいWorkerが使われることになる。
// ================================================================================================
// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import PlaintextWorker from "./workers/plaintext?worker";
import TypescriptWorker from "./workers/typescript?worker";
// 他の言語のWorkerも将来的にここに追加

export default defineBackground(() => {
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
    // メッセージハンドラの登録
    // ----------------------------------------------------------------
    /** test-setup -> worker生成 -> worker-ready -> test-ready */
    browser.runtime.onMessage.addListener(async (message, sender) => {
        if (message.type === "test-setup") {
            const { id, language } = message.payload;
            console.log(`Received test-setup for id=${id}, language=${language}`);
            const WorkerConstructor = workerConstructors[language];
            // ==== Ensure sender tab exists ====
            const tabId = sender.tab?.id;
            if (!tabId) {
                console.error("Received test-setup from a sender without a tab ID.");
                return;
            }
            // ==== 未対応言語の場合はエラーを返す ====
            if (!WorkerConstructor) {
                console.error(`Unsupported language: ${language}`);
                await browser.tabs.sendMessage(tabId, {
                    type: "test-error",
                    payload: { id, error: `Unsupported language: ${language}` },
                });
                return;
            }
            // ==== すでにWorkerが存在する場合はすぐにtest-readyを返す ====
            if (workers.has(language)) {
                console.log(`Worker for language=${language} already exists. Sending test-ready.`);
                await browser.tabs.sendMessage(tabId, {
                    type: "test-ready",
                    payload: { id, language },
                });
                return;
            }
            // ==== 新しいWorkerを生成する ====
            console.log(`Creating new Worker for language=${language}`);
            const worker = new WorkerConstructor();
            // workerからのworker-readyを待つ
            const workerReadyPromise = new Promise<void>((resolve) => {
                worker.addEventListener("message", (event) => {
                    const workerMessage = event.data;
                    if (workerMessage.type === "worker-ready") {
                        console.log(`Worker for language=${language} is ready.`);
                        resolve();
                    }
                });
            });
            // Workerを登録
            workers.set(language, worker);
            // worker-readyを待つ
            await workerReadyPromise;
            // test-readyを送信
            await browser.tabs.sendMessage(tabId, {
                type: "test-ready",
                payload: { id, language },
            });
        }
    });
    /** test-run -> worker-run -> worker-result/worker-error -> test-result/test-error */
    browser.runtime.onMessage.addListener(async (message, sender) => {
        if (message.type === "test-run") {
            const { id, code, language, stdin, timeLimitMs } = message.payload;
            console.log(`Received test-run for id=${id}, language=${language}`);
            // ==== Ensure sender tab exists ====
            const tabId = sender.tab?.id;
            if (!tabId) {
                console.error("Received test-run from a sender without a tab ID.");
                return;
            }

            const worker = workers.get(language);
            // ==== 未対応 or Worker未生成の場合はエラーを返す ====
            if (!worker) {
                console.error(`Worker for language=${language} is not available.`);
                await browser.tabs.sendMessage(tabId, {
                    type: "test-error",
                    payload: { id, error: `Worker for language=${language} is not available.` },
                });
                return;
            }
            // ==== worker-run -> worker-result/errorのPromiseと同時に、timeLimitMs経ったらexitCode = 9で戻るPromiseを作成。先に戻る方をPromise.raceで待つ ====
            const workerResponsePromise = new Promise<{ stdout: string; stderr: string; exitCode: number; error?: string }>((resolve) => {
                const onMessage = (event: MessageEvent) => {
                    const workerMessage = event.data;
                    if (workerMessage.type === "worker-result") {
                        const { stdout, stderr, exitCode } = workerMessage.payload;
                        resolve({ stdout, stderr, exitCode });
                        worker.removeEventListener("message", onMessage);
                    } else if (workerMessage.type === "worker-error") {
                        const { error } = workerMessage.payload;
                        resolve({ stdout: "", stderr: "", exitCode: 1, error });
                        worker.removeEventListener("message", onMessage);
                    }
                };
                worker.addEventListener("message", onMessage);
            });
            const timeoutPromise = new Promise<{ stdout: string; stderr: string; exitCode: number; error?: string }>((resolve) => {
                setTimeout(() => {
                    resolve({ stdout: "", stderr: "Time Limit Exceeded", exitCode: 9, error: "Time Limit Exceeded" });
                }, timeLimitMs);
            });
            // Promise.raceを開始し、直後にworker-runを送信
            const racePromise = Promise.race([workerResponsePromise, timeoutPromise]);
            worker.postMessage({
                type: "worker-run",
                payload: { code, stdin },
            });
            // 結果を待つ
            const result = await racePromise;
            // TLEの場合はWorkerをterminateして新しいWorkerに差し替えておく
            if (result.exitCode === 9) {
                console.log(`Time Limit Exceeded for id=${id}, terminating Worker for language=${language}`);
                worker.terminate();
                workers.delete(language);
                // 新しいWorkerを生成して登録しておく
                const WorkerConstructor = workerConstructors[language];
                const newWorker = new WorkerConstructor();
                // worker-readyを待つ
                const newWorkerReadyPromise = new Promise<void>((resolve) => {
                    newWorker.addEventListener("message", (event) => {
                        const workerMessage = event.data;
                        if (workerMessage.type === "worker-ready") {
                            console.log(`New Worker for language=${language} is ready.`);
                            resolve();
                        }
                    });
                });
                workers.set(language, newWorker);
                await newWorkerReadyPromise;
            }
            // ==== 結果を送信 ====
            await browser.tabs.sendMessage(tabId, {
                type: "test-result",
                payload: { id, ...result },
            });
        }
    });
});
