// ================================================================================================
// Chrome MV3 Offscreen Document — Exec Host
// Background から execInOffscreen を受け、runInWorker して結果を返す。
// （createDocument / permission は別途。このファイルはページ本体のみ）
// ================================================================================================

import { runInWorker } from "@/utils/execution/host/runInWorker";
import type { CodeTestResult, ExecInOffscreenMessage, ExecResponseMessage } from "@/utils/execution/types";

const asCe = (message: string): CodeTestResult => ({
    status: "CE",
    execTime: -1,
    stdout: "",
    stderr: message,
});

browser.runtime.onMessage.addListener((message, sender) => {
    if (message?.type !== "execInOffscreen") return;

    // Content Script から直接来たものは無視（Background 経由のみ）
    if (typeof sender.tab?.id === "number") return;

    const req = message as ExecInOffscreenMessage;

    return runInWorker({
        id: req.id,
        language: req.language,
        code: req.code,
        stdin: req.stdin,
        timeLimitMs: req.timeLimitMs,
    })
        .then(
            (codeTestResult): ExecResponseMessage => ({
                type: "execResponse",
                id: req.id,
                codeTestResult,
            }),
        )
        .catch(
            (error: unknown): ExecResponseMessage => ({
                type: "execResponse",
                id: req.id,
                codeTestResult: asCe(error instanceof Error ? error.message : String(error)),
            }),
        );
});
