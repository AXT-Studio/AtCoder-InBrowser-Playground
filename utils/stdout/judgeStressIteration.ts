import type { CodeTestResult } from "@/utils/execution/types";
import { isOutputCorrect } from "./isOutputCorrect";

/** Stress mode の Status 欄に出す判定 */
export type StressVerdict =
    | "AC"
    | "WA"
    | "Solve TLE"
    | "Naive TLE"
    | "Gen TLE"
    | "Solve RE"
    | "Naive RE"
    | "Gen RE"
    | "CE";

/**
 * Stress の1イテレーション（Gen → Naive → Solve → 比較）の結果を判定する。
 * このラウンドが成功（出力一致）なら `null`、打ち切りなら対応する verdict。
 * 前段が completed でないとき、後段の結果は不要（無視する）。
 */
export function judgeStressIteration(
    gen: CodeTestResult,
    naive: CodeTestResult | null,
    solve: CodeTestResult | null,
    allowableError: number,
): StressVerdict | null {
    switch (gen.status) {
        case "CE":
            return "CE";
        case "RE":
            return "Gen RE";
        case "TLE":
            return "Gen TLE";
        case "completed":
            break;
    }

    if (naive === null) {
        throw new Error("judgeStressIteration: naive result is required when gen completed");
    }

    switch (naive.status) {
        case "CE":
            return "CE";
        case "RE":
            return "Naive RE";
        case "TLE":
            return "Naive TLE";
        case "completed":
            break;
    }

    if (solve === null) {
        throw new Error("judgeStressIteration: solve result is required when naive completed");
    }

    switch (solve.status) {
        case "CE":
            return "CE";
        case "RE":
            return "Solve RE";
        case "TLE":
            return "Solve TLE";
        case "completed":
            return isOutputCorrect(naive.stdout, solve.stdout, allowableError) ? null : "WA";
    }
}
