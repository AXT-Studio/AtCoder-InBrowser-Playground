import { describe, expect, it } from "vitest";
import { formatTemplateHeader } from "./formatHeader";
import { insertTemplate, listTemplates } from "./index";

describe("formatTemplateHeader", () => {
    it("formats role comments for submission / naive / generator", () => {
        const base = {
            contestTitle: "ABC 1",
            taskTitle: "A - Task",
            taskURL: "https://atcoder.jp/contests/abc1/tasks/abc1_a",
            runtimeLabel: "TypeScript (Bun)",
        };

        expect(formatTemplateHeader({ ...base, role: "submission" })).toContain(
            "// TypeScript (Bun) [Main] Submission",
        );
        expect(formatTemplateHeader({ ...base, role: "naive" })).toContain(
            "// TypeScript (Bun) [Naive] Comparative Implementation",
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
    it("returns solver templates for submission/naive and generator ones for generator", () => {
        const solve = listTemplates("typescript", "submission");
        expect(solve[0]?.id).toBe("ts_bun_scanner");
        expect(solve.some((t) => t.id === "ts_bun_scanner")).toBe(true);
        expect(solve.some((t) => t.id === "ts_bun")).toBe(false);
        expect(solve.every((t) => t.kind === "solver")).toBe(true);

        const gen = listTemplates("typescript", "generator");
        expect(gen.some((t) => t.id === "gen_ts_bun")).toBe(true);
        expect(gen.every((t) => t.kind === "generator")).toBe(true);
    });

    it("returns empty for python/plaintext", () => {
        expect(listTemplates("python", "submission")).toEqual([]);
        expect(listTemplates("plaintext", "generator")).toEqual([]);
    });
});

describe("insertTemplate", () => {
    it("inserts with role-aware header and confirms overwrite", () => {
        const result = insertTemplate({
            templateKey: "ts_bun_scanner",
            contestTitle: "C",
            taskTitle: "T",
            taskURL: "U",
            role: "naive",
            currentCode: "",
            confirm: () => false,
        });
        expect(result.action).toBe("insert");
        if (result.action === "insert") {
            expect(result.template).toContain(
                "// TypeScript (Bun, using InputScanner) [Naive] Comparative Implementation",
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
});
