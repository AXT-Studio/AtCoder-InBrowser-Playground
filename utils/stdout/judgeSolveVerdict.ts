import type { CodeTestResult } from "@/utils/execution/types";
import { isOutputCorrect } from "./isOutputCorrect";

/** Solve mode の Status 欄に出す判定 */
export type SolveVerdict = "AC" | "WA" | "TLE" | "RE" | "CE";

/**
 * 実行結果と期待出力から Solve 用の表示ステータスを決める。
 * AC/WA 判定は Content 側（ここ）の責務。Runner の completed をそのまま出さない。
 */
export function judgeSolveVerdict(result: CodeTestResult, expected: string, allowableError: number): SolveVerdict {
    switch (result.status) {
        case "TLE":
            return "TLE";
        case "RE":
            return "RE";
        case "CE":
            return "CE";
        case "completed":
            return isOutputCorrect(expected, result.stdout, allowableError) ? "AC" : "WA";
    }
}
