import type { CodeTestResult } from "@/utils/execution/types";
import { isOutputCorrect } from "./isOutputCorrect";

/** Compare mode の Status 欄に出す判定 */
export type CompareVerdict = "AC" | "WA" | "Solve TLE" | "Compare TLE" | "Solve RE" | "Compare RE" | "CE";

/**
 * Compare → Solve の順で得た実行結果から Compare 用ステータスを決める。
 * Compare が completed でないときは solve は渡さなくてよい（無視する）。
 * 両方 completed のときは Compare 出力を期待、Solve 出力を実際として比較する。
 */
export function judgeCompareVerdict(
    compare: CodeTestResult,
    solve: CodeTestResult | null,
    allowableError: number,
): CompareVerdict {
    switch (compare.status) {
        case "CE":
            return "CE";
        case "RE":
            return "Compare RE";
        case "TLE":
            return "Compare TLE";
        case "completed":
            break;
    }

    if (solve === null) {
        throw new Error("judgeCompareVerdict: solve result is required when compare completed");
    }

    switch (solve.status) {
        case "CE":
            return "CE";
        case "RE":
            return "Solve RE";
        case "TLE":
            return "Solve TLE";
        case "completed":
            return isOutputCorrect(compare.stdout, solve.stdout, allowableError) ? "AC" : "WA";
    }
}
