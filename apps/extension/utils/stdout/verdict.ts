// ================================================================================================
// 判定(AC, WA, ...)を決める
// ================================================================================================

import type { TestVerdict } from "./types";
import type { CodeTestResultWithTLE } from "@/utils/runners/types";
import { isStdoutCorrect } from "@/utils/stdout/compare";

/**
 * 実行結果、実行時間、実行制限時間、期待される出力、許容誤差を受け取り、その実行の判定を返します。
 */
export const deriveTestVerdict = (
    runResponse: CodeTestResultWithTLE,
    execTimeMs: number,
    timeLimitMs: number,
    expectedOutput: string,
    allowableError: number,
): TestVerdict => {
    const isCorrect =
        runResponse.status === "success" &&
        isStdoutCorrect(expectedOutput, runResponse.details.stdout, allowableError);
    if (execTimeMs > timeLimitMs) {
        // ==== execTime・isCorrectに応じて場合分けして適切に結果を更新 ====
        // 実行時間が制限を超えている場合はTLE
        return "TLE";
    } else if (runResponse.status === "failure") {
        // Failureが返ってきている場合、中身のerrorType(RE, CE, TLEがあり得る)を見て判断
        switch (runResponse.details.kind) {
            case "TLE":
                return "TLE";
            case "RE":
                return "RE";
            case "CE":
                return "CE";
            default:
                return "RE";
        }
    } else if (isCorrect) {
        // stdoutが正しい場合はAC
        return "AC";
    } else {
        // stdoutが正しくない場合はWA
        return "WA";
    }
};
