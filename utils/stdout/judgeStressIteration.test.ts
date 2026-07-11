import { describe, expect, it } from "vitest";
import { judgeStressIteration } from "./judgeStressIteration";
import type { CodeTestResult } from "@/utils/execution/types";

const base = (over: Partial<CodeTestResult>): CodeTestResult => ({
    status: "completed",
    execTime: 1,
    stdout: "",
    stderr: "",
    ...over,
});

describe("judgeStressIteration", () => {
    it("Gen の失敗を先に返す", () => {
        expect(judgeStressIteration(base({ status: "CE", execTime: -1 }), null, null, 1e-6)).toBe("CE");
        expect(judgeStressIteration(base({ status: "RE" }), null, null, 1e-6)).toBe("Gen RE");
        expect(judgeStressIteration(base({ status: "TLE" }), null, null, 1e-6)).toBe("Gen TLE");
    });

    it("Naive / Solve の失敗", () => {
        const gen = base({ stdout: "in" });
        expect(judgeStressIteration(gen, base({ status: "RE" }), null, 1e-6)).toBe("Naive RE");
        expect(judgeStressIteration(gen, base({ status: "TLE" }), null, 1e-6)).toBe("Naive TLE");
        expect(judgeStressIteration(gen, base({ stdout: "1" }), base({ status: "RE" }), 1e-6)).toBe(
            "Solve RE",
        );
        expect(judgeStressIteration(gen, base({ stdout: "1" }), base({ status: "TLE" }), 1e-6)).toBe(
            "Solve TLE",
        );
        expect(
            judgeStressIteration(gen, base({ stdout: "1" }), base({ status: "CE", execTime: -1 }), 1e-6),
        ).toBe("CE");
    });

    it("一致なら null（継続）、不一致なら WA", () => {
        const gen = base({ stdout: "in" });
        expect(judgeStressIteration(gen, base({ stdout: "1" }), base({ stdout: "1" }), 1e-6)).toBeNull();
        expect(judgeStressIteration(gen, base({ stdout: "1" }), base({ stdout: "2" }), 1e-6)).toBe("WA");
    });
});
