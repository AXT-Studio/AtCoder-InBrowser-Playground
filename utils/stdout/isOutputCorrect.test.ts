import { describe, expect, it } from "vitest";
import { isOutputCorrect } from "./isOutputCorrect";

describe("isOutputCorrect", () => {
    it("完全一致なら true", () => {
        expect(isOutputCorrect("1 2\n3", "1 2\n3", 1e-6)).toBe(true);
    });

    it("許容誤差内の数値差は true", () => {
        expect(isOutputCorrect("1.0", "1.0000001", 1e-6)).toBe(true);
    });

    it("許容誤差を超える数値差は false", () => {
        expect(isOutputCorrect("1.0", "1.1", 1e-6)).toBe(false);
    });

    it("非数値トークンは文字列一致", () => {
        expect(isOutputCorrect("yes", "yes", 1e-6)).toBe(true);
        expect(isOutputCorrect("yes", "no", 1e-6)).toBe(false);
    });
});
