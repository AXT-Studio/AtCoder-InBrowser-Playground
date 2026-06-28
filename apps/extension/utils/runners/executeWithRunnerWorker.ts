// ================================================================================================
// Runner Worker 経由のコード実行（MV2 Background / MV3 Offscreen 共通）
// ================================================================================================

import { RUNNER_WORKER_IDLE_MS } from "./constants";
import type {
    CodeTestContext,
    CodeTestResult,
    CodeTestResultWithTLE,
    RunnerWorkerExecMessageData,
} from "./types";

// ----------------------------------------------------------------
// types
// ----------------------------------------------------------------

export type ExecuteWithRunnerWorkerParams = {
    language: keyof CodeTestContext;
    code: string;
    stdin: string;
    timeLimitMs: number;
};

export type CreateRunnerWorker = () => Worker;

export type ExecuteWithRunnerWorker = (
    params: ExecuteWithRunnerWorkerParams,
) => Promise<CodeTestResultWithTLE>;

// ----------------------------------------------------------------
// factory
// ----------------------------------------------------------------

export const createRunnerWorkerExecutor = (
    createWorker: CreateRunnerWorker,
): ExecuteWithRunnerWorker => {
    let runnerWorker: Worker | null = null;
    let idleTimerId: ReturnType<typeof setTimeout> | null = null;
    let isExecuting = false;

    const clearIdleTimer = (): void => {
        if (idleTimerId !== null) {
            clearTimeout(idleTimerId);
            idleTimerId = null;
        }
    };

    const terminateRunnerWorker = (): void => {
        if (runnerWorker) {
            runnerWorker.terminate();
            runnerWorker = null;
        }
    };

    const scheduleIdleTermination = (): void => {
        clearIdleTimer();
        idleTimerId = setTimeout(() => {
            idleTimerId = null;
            if (!isExecuting && runnerWorker) {
                terminateRunnerWorker();
            }
        }, RUNNER_WORKER_IDLE_MS);
    };

    return async (params: ExecuteWithRunnerWorkerParams): Promise<CodeTestResultWithTLE> => {
        const { language, code, stdin, timeLimitMs } = params;

        clearIdleTimer();
        isExecuting = true;

        try {
            if (!runnerWorker) {
                runnerWorker = createWorker();
            }

            const execMessageData = {
                type: "exec",
                language,
                code,
                stdin,
            } as RunnerWorkerExecMessageData;
            runnerWorker.postMessage(execMessageData);

            await new Promise<void>((resolve) => {
                runnerWorker?.addEventListener("message", function handleMessage(event) {
                    if (event.data?.type === "ready") {
                        runnerWorker?.removeEventListener("message", handleMessage);
                        resolve();
                    }
                });
            });

            let onResultMessage!: (event: MessageEvent) => void;
            const waitForResult = new Promise<CodeTestResult>((resolve) => {
                onResultMessage = (event: MessageEvent) => {
                    if (event.data?.type === "result") {
                        runnerWorker?.removeEventListener("message", onResultMessage);
                        resolve(event.data?.data as CodeTestResult);
                    }
                };
                runnerWorker?.addEventListener("message", onResultMessage);
            });
            const timeoutPromise = new Promise<CodeTestResultWithTLE>((resolve) => {
                setTimeout(() => {
                    resolve({
                        status: "failure",
                        details: {
                            kind: "TLE",
                            message: `Time limit (${timeLimitMs}ms) exceeded`,
                        },
                    });
                }, timeLimitMs);
            });

            const raceResult = await Promise.race([waitForResult, timeoutPromise]);

            if (raceResult.status === "failure") {
                runnerWorker?.removeEventListener("message", onResultMessage);
                clearIdleTimer();
                terminateRunnerWorker();
            } else {
                scheduleIdleTermination();
            }

            return raceResult as CodeTestResultWithTLE;
        } finally {
            isExecuting = false;
        }
    };
};
