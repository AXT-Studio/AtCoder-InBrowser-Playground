import type { CodeTestResult, StartMessage, ReadyMessage, ResultMessage } from "../types";

// Exec Host
export function runInWorker(req: {
    id: string;
    language: string;
    code: string;
    stdin: string;
    timeLimitMs: number;
}): Promise<CodeTestResult> {
    return new Promise((resolve, _reject) => {
        const worker = new Worker(new URL("../runner/worker.ts", import.meta.url), { type: "module" });
        let readyAt: number | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const finish = (result: CodeTestResult) => {
            if (timer) {
                clearTimeout(timer);
            }
            worker.removeEventListener("message", onMessage);
            worker.terminate();
            resolve(result);
        };

        const onMessage = (event: MessageEvent<ReadyMessage | ResultMessage>) => {
            const msg = event.data;
            if (msg.type === "ready") {
                readyAt = performance.now();
                timer = setTimeout(() => {
                    finish({
                        status: "TLE",
                        stdout: "",
                        stderr: "Time limit exceeded",
                        execTime: Math.round(performance.now() - readyAt!),
                    });
                }, req.timeLimitMs);
                return;
            } else if (msg.type === "result") {
                const elapsedTime = (() => {
                    if (msg.result.status === "CE") {
                        return -1;
                    } else if (readyAt === null) {
                        return 0; // readyする前にresultが来た場合 (たぶんないと思うが……)
                    } else {
                        return Math.round(performance.now() - readyAt);
                    }
                })();
                finish({
                    status: msg.result.status,
                    stdout: msg.result.stdout,
                    stderr: msg.result.stderr,
                    execTime: elapsedTime,
                });
            }
        };

        worker.addEventListener("message", onMessage);
        worker.postMessage({
            type: "start",
            id: req.id,
            language: req.language,
            code: req.code,
            stdin: req.stdin,
        } satisfies StartMessage);

        // 一応エラー処理
        worker.onerror = (event) => {
            finish({
                status: "RE",
                stdout: "",
                stderr: "Worker error: " + String(event.message),
                execTime: -1,
            });
        };
    });
}
