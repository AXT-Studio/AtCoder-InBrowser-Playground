import { describe, expect, it } from "vitest";
import { shouldWarnDfsAndBun } from "./prepareSubmissionGuards";

describe("shouldWarnDfsAndBun", () => {
    it("warns when a dfs declaration and Bun. both appear", () => {
        expect(shouldWarnDfsAndBun("function dfs() {}\nMain(await Bun.file")).toBe(true);
        expect(shouldWarnDfsAndBun("const dfs = () => {}\nMain(await Bun.file")).toBe(true);
        expect(shouldWarnDfsAndBun("let dfs = () => {}\nMain(await Bun.file")).toBe(true);
        expect(shouldWarnDfsAndBun("function  dfs () {}\nMain(await Bun.file")).toBe(true);
        expect(shouldWarnDfsAndBun("const  dfs  = () => {}\nMain(await Bun.file")).toBe(true);
        expect(shouldWarnDfsAndBun("let  dfs  = () => {}\nMain(await Bun.file")).toBe(true);
    });

    it("does not warn without both a dfs declaration and Bun.", () => {
        expect(shouldWarnDfsAndBun("function dfs() {}")).toBe(false);
        expect(shouldWarnDfsAndBun("const dfs = () => {}")).toBe(false);
        expect(shouldWarnDfsAndBun("let dfs = () => {}")).toBe(false);
        expect(shouldWarnDfsAndBun("await Bun.file('/dev/stdin').text()")).toBe(false);
        expect(shouldWarnDfsAndBun("dfs(0)\nMain(await Bun.file")).toBe(false);
        expect(shouldWarnDfsAndBun("// dfs\nMain(await Bun.file")).toBe(false);
    });
});
