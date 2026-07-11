import { describe, expect, it } from "vitest";
import { shouldWarnDfsAndBun } from "./prepareSubmissionGuards";

describe("shouldWarnDfsAndBun", () => {
    it("warns only when both dfs and Bun appear", () => {
        expect(shouldWarnDfsAndBun("function dfs() {}\nMain(await Bun.file")).toBe(true);
        expect(shouldWarnDfsAndBun("function dfs() {}")).toBe(false);
        expect(shouldWarnDfsAndBun("await Bun.file('/dev/stdin').text()")).toBe(false);
    });
});
