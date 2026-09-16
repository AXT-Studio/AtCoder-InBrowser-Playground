import { describe, expect, it } from "vitest";
import { formatTemplateHeader } from "./formatHeader";
import { insertTemplate, listTemplates } from "./index";

describe("formatTemplateHeader", () => {
    it("formats role comments for submission / compare / generator", () => {
        const base = {
            contestTitle: "ABC 1",
            taskTitle: "A - Task",
            taskURL: "https://atcoder.jp/contests/abc1/tasks/abc1_a",
            runtimeLabel: "TypeScript (Bun)",
        };

        expect(formatTemplateHeader({ ...base, role: "submission" })).toContain(
            "// TypeScript (Bun) [Main] Submission",
        );
        expect(formatTemplateHeader({ ...base, role: "compare" })).toContain(
            "// TypeScript (Bun) [Compare] Comparative Implementation",
        );
        expect(formatTemplateHeader({ ...base, role: "generator" })).toContain(
            "// TypeScript (Bun) [Gen] Testcase Input Generator",
        );
        expect(
            formatTemplateHeader({
                ...base,
                role: "submission",
                runtimeVariant: "using InputScanner",
            }),
        ).toContain("// TypeScript (Bun, using InputScanner) [Main] Submission");
        expect(
            formatTemplateHeader({
                ...base,
                role: "submission",
                runtimeVariant: "INTERACTIVE",
            }),
        ).toContain("// TypeScript (Bun, INTERACTIVE) [Main] Submission");
    });
});

describe("listTemplates", () => {
    it("returns solver templates for submission/compare and generator ones for generator", () => {
        const solve = listTemplates("typescript", "submission");
        expect(solve[0]?.id).toBe("ts_bun_scanner");
        expect(solve.some((t) => t.id === "ts_bun_scanner")).toBe(true);
        expect(solve.some((t) => t.id === "ts_bun")).toBe(false);
        expect(solve.every((t) => t.kind === "solver")).toBe(true);

        const gen = listTemplates("typescript", "generator");
        expect(gen.some((t) => t.id === "gen_ts_bun")).toBe(true);
        expect(gen.every((t) => t.kind === "generator")).toBe(true);
    });

    it("returns empty for python/ruby/plaintext generator, and cpp solver only", () => {
        expect(listTemplates("python", "submission")).toEqual([]);
        expect(listTemplates("ruby", "submission")).toEqual([]);
        expect(listTemplates("plaintext", "generator")).toEqual([]);
        expect(listTemplates("cpp", "submission").map((t) => t.id)).toEqual(["cpp_solver"]);
        expect(listTemplates("cpp", "generator")).toEqual([]);
    });

    it("returns lua scanner for submission/compare and lua generator for generator", () => {
        const solve = listTemplates("lua", "submission");
        expect(solve.map((t) => t.id)).toEqual(["lua_scanner"]);
        expect(listTemplates("lua", "compare").map((t) => t.id)).toEqual(["lua_scanner"]);
        expect(listTemplates("lua", "generator").map((t) => t.id)).toEqual(["gen_lua"]);
    });
});

describe("insertTemplate", () => {
    it("inserts with role-aware header and confirms overwrite", () => {
        const result = insertTemplate({
            templateKey: "ts_bun_scanner",
            contestTitle: "C",
            taskTitle: "T",
            taskURL: "U",
            role: "compare",
            currentCode: "",
            confirm: () => false,
        });
        expect(result.action).toBe("insert");
        if (result.action === "insert") {
            expect(result.template).toContain(
                "// TypeScript (Bun, using InputScanner) [Compare] Comparative Implementation",
            );
        }

        const cancelled = insertTemplate({
            templateKey: "ts_bun_scanner",
            contestTitle: "C",
            taskTitle: "T",
            taskURL: "U",
            role: "submission",
            currentCode: "existing",
            confirm: () => false,
        });
        expect(cancelled.action).toBe("cancelled");
    });

    it("embeds InputScanner via ?raw and puts variant inside runtime parens", () => {
        const scanner = insertTemplate({
            templateKey: "ts_bun_scanner",
            contestTitle: "C",
            taskTitle: "T",
            taskURL: "U",
            role: "submission",
            currentCode: "",
            confirm: () => false,
        });
        expect(scanner.action).toBe("insert");
        if (scanner.action === "insert") {
            expect(scanner.template).toContain("// TypeScript (Bun, using InputScanner) [Main] Submission");
            expect(scanner.template).toContain("class InputScanner");
        }

        const interactive = insertTemplate({
            templateKey: "ts_bun_interactive",
            contestTitle: "C",
            taskTitle: "T",
            taskURL: "U",
            role: "submission",
            currentCode: "",
            confirm: () => false,
        });
        expect(interactive.action).toBe("insert");
        if (interactive.action === "insert") {
            expect(interactive.template).toContain("// TypeScript (Bun, INTERACTIVE) [Main] Submission");
        }
    });

    it("inserts lua templates with -- header and page context", () => {
        const scanner = insertTemplate({
            templateKey: "lua_scanner",
            contestTitle: "ABC 1",
            taskTitle: "A - Task",
            taskURL: "https://atcoder.jp/contests/abc1/tasks/abc1_a",
            role: "submission",
            currentCode: "",
            confirm: () => false,
        });
        expect(scanner.action).toBe("insert");
        if (scanner.action === "insert") {
            expect(scanner.template).toContain("-- ABC 1");
            expect(scanner.template).toContain("-- A - Task");
            expect(scanner.template).toContain("-- (URL: https://atcoder.jp/contests/abc1/tasks/abc1_a)");
            expect(scanner.template).toContain("-- Lua (w/ Input scanner) [Main] Submission");
            expect(scanner.template).toContain('io.read("a")');
            expect(scanner.template).toContain("local function int()");
        }

        const gen = insertTemplate({
            templateKey: "gen_lua",
            contestTitle: "ABC 1",
            taskTitle: "A - Task",
            taskURL: "https://atcoder.jp/contests/abc1/tasks/abc1_a",
            role: "generator",
            currentCode: "",
            confirm: () => false,
        });
        expect(gen.action).toBe("insert");
        if (gen.action === "insert") {
            expect(gen.template).toContain("-- Lua [Gen] Testcase Input Generator");
            expect(gen.template).toContain("math.random(1, 100)");
        }
    });

    it("inserts C++ solver template with bits/stdc++.h", () => {
        const result = insertTemplate({
            templateKey: "cpp_solver",
            contestTitle: "ABC 1",
            taskTitle: "A - Task",
            taskURL: "https://atcoder.jp/contests/abc1/tasks/abc1_a",
            role: "submission",
            currentCode: "",
            confirm: () => false,
        });
        expect(result.action).toBe("insert");
        if (result.action === "insert") {
            expect(result.template).toContain("// C++ (Clang) [Main] Submission");
            expect(result.template).toContain("#include <bits/stdc++.h>");
            expect(result.template).toContain("#include <iostream>");
            expect(result.template).toContain("int main()");
        }
    });
});
