import { runInWorker } from "@/utils/execution/host/runInWorker";
import type { ExecRequestMessage, ExecResponseMessage } from "@/utils/execution/types";

export default defineBackground(() => {
    browser.runtime.onMessage.addListener(async (message) => {
        if (message?.type !== "execRequest") return;

        const req = message as ExecRequestMessage;
        const codeTestResult = await runInWorker({
            id: req.id,
            language: req.language,
            code: req.code,
            stdin: req.stdin,
            timeLimitMs: req.timeLimitMs,
        });
        return {
            type: "execResponse",
            id: req.id,
            codeTestResult,
        } satisfies ExecResponseMessage;
    });
});
