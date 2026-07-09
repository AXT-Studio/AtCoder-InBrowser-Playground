// ================================================================================================
// テスト実行のオーケストレーション
// ================================================================================================

import { deriveTestVerdict } from "@/utils/stdout/verdict";
import type { TestVerdict } from "@/utils/stdout/types";
import { executeCode } from "./executeCode";

// ----------------------------------------------------------------
// types
// ----------------------------------------------------------------

export type RunTestParams = {
    code: string;
    stdin: string;
    expected: string;
    selectedLanguage: string;
    timeLimitMs: number;
    allowableError: number;
};

export type RunTestResult = {
    verdict: TestVerdict;
    stdout: string;
    stderr: string;
    execTimeMs: number;
};

// ----------------------------------------------------------------
// テスト実行
// ----------------------------------------------------------------

export const runTest = async (params: RunTestParams): Promise<RunTestResult> => {
    const { code, stdin, expected, selectedLanguage, timeLimitMs, allowableError } = params;

    try {
        const startTime = performance.now();
        const runResponse = await executeCode(selectedLanguage, code, stdin, timeLimitMs);
        const execTimeMs = performance.now() - startTime;

        const stdout = runResponse.status === "success" ? runResponse.details.stdout : "";
        const stderr =
            runResponse.status === "success"
                ? runResponse.details.stderr
                : runResponse.details.message;

        const verdict = deriveTestVerdict(
            runResponse,
            execTimeMs,
            timeLimitMs,
            expected,
            allowableError,
        );

        return { verdict, stdout, stderr, execTimeMs };
    } catch (error) {
        return {
            verdict: "RE",
            stdout: "",
            stderr: `Unexpected error: ${(error as Error).message}`,
            execTimeMs: 0,
        };
    }
};
