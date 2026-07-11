import { describe, expect, it } from "vitest";
import { judgeSolveVerdict } from "./judgeSolveVerdict";
import type { CodeTestResult } from "@/utils/execution/types";

const base = (over: Partial<CodeTestResult>): CodeTestResult => ({
    status: "completed",
    execTime: 1,
    stdout: "",
    stderr: "",
    ...over,
});

describe("judgeSolveVerdict", () => {
    it("completed + 一致 → AC", () => {
        expect(judgeSolveVerdict(base({ stdout: "1" }), "1", 1e-6)).toBe("AC");
    });

    it("completed + 不一致 → WA", () => {
        expect(judgeSolveVerdict(base({ stdout: "1" }), "2", 1e-6)).toBe("WA");
    });

    it("実行失敗はそのまま", () => {
        expect(judgeSolveVerdict(base({ status: "TLE" }), "1", 1e-6)).toBe("TLE");
        expect(judgeSolveVerdict(base({ status: "RE", execTime: 1 }), "1", 1e-6)).toBe("RE");
        expect(judgeSolveVerdict(base({ status: "CE", execTime: -1 }), "1", 1e-6)).toBe("CE");
    });
});
