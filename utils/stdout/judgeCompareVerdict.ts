import type { CodeTestResult } from "@/utils/execution/types";
import { isOutputCorrect } from "./isOutputCorrect";

/** Compare mode の Status 欄に出す判定 */
export type CompareVerdict =
    | "AC"
    | "WA"
    | "Solve TLE"
    | "Naive TLE"
    | "Solve RE"
    | "Naive RE"
    | "CE";

/**
 * Naive → Solve の順で得た実行結果から Compare 用ステータスを決める。
 * Naive が completed でないときは solve は渡さなくてよい（無視する）。
 * 両方 completed のときは Naive 出力を期待、Solve 出力を実際として比較する。
 */
export function judgeCompareVerdict(
    naive: CodeTestResult,
    solve: CodeTestResult | null,
    allowableError: number,
): CompareVerdict {
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
        throw new Error("judgeCompareVerdict: solve result is required when naive completed");
    }

    switch (solve.status) {
        case "CE":
            return "CE";
        case "RE":
            return "Solve RE";
        case "TLE":
            return "Solve TLE";
        case "completed":
            return isOutputCorrect(naive.stdout, solve.stdout, allowableError) ? "AC" : "WA";
    }
}
