import { describe, expect, it } from "vitest";
import { judgeCompareVerdict } from "./judgeCompareVerdict";
import type { CodeTestResult } from "@/utils/execution/types";

const base = (over: Partial<CodeTestResult>): CodeTestResult => ({
    status: "completed",
    execTime: 1,
    stdout: "",
    stderr: "",
    ...over,
});

describe("judgeCompareVerdict", () => {
    it("Compare の失敗を先に返す", () => {
        expect(judgeCompareVerdict(base({ status: "CE", execTime: -1 }), null, 1e-6)).toBe("CE");
        expect(judgeCompareVerdict(base({ status: "RE" }), null, 1e-6)).toBe("Compare RE");
        expect(judgeCompareVerdict(base({ status: "TLE" }), null, 1e-6)).toBe("Compare TLE");
    });

    it("Compare completed 後の Solve 失敗", () => {
        const compare = base({ stdout: "1" });
        expect(judgeCompareVerdict(compare, base({ status: "CE", execTime: -1 }), 1e-6)).toBe("CE");
        expect(judgeCompareVerdict(compare, base({ status: "RE" }), 1e-6)).toBe("Solve RE");
        expect(judgeCompareVerdict(compare, base({ status: "TLE" }), 1e-6)).toBe("Solve TLE");
    });

    it("両方 completed なら出力比較", () => {
        expect(judgeCompareVerdict(base({ stdout: "1" }), base({ stdout: "1" }), 1e-6)).toBe("AC");
        expect(judgeCompareVerdict(base({ stdout: "1" }), base({ stdout: "2" }), 1e-6)).toBe("WA");
    });
});
