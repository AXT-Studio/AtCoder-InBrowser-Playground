import { describe, expect, it } from "vitest";
import { formatRuntimeError, formatTransformError, remapStack } from "./formatError";

/** generated 3:22 (1-based) → original 3:24 になる最小 decoded map */
const issueSampleMap = JSON.stringify({
    version: 3,
    sources: ["Main.js"],
    names: [],
    mappings: [[], [], [[21, 0, 2, 23]]],
});

describe("remapStack", () => {
    it("QuickJS の 1-based 列を sourcemap の 0-based 列に合わせて戻す", () => {
        const remapped = remapStack("    at Main (Main.js:3:22)\n", issueSampleMap);
        expect(remapped).toContain("Main.js:3:24");
        expect(remapped).not.toContain("Main.js:3:22");
    });

    it("map が無い／壊れているときは座標を変えない", () => {
        const stack = "    at Main (Main.js:3:22)\n";
        expect(remapStack(stack, undefined)).toBe(stack);
        expect(remapStack(stack, "not-json")).toBe(stack);
    });

    it("マップできないフレームはそのまま残す", () => {
        const remapped = remapStack("    at Main (Main.js:9:1)\n", issueSampleMap);
        expect(remapped).toContain("Main.js:9:1");
    });
});

describe("formatRuntimeError", () => {
    it("dump オブジェクトを JSON ではなく Name: message + stack にする", () => {
        const formatted = formatRuntimeError(
            {
                name: "TypeError",
                message: "cannot read property of undefined",
                stack: "    at Main (Main.js:3:22)\n    at <eval> (Main.js:5:5)\n",
            },
            undefined,
        );
        expect(formatted.startsWith("{")).toBe(false);
        expect(formatted).toContain("TypeError: cannot read property of undefined");
        expect(formatted).toContain("at Main (Main.js:3:22)");
        expect(() => JSON.parse(formatted)).toThrow();
    });

    it("stack の行・列を sourcemap で戻す", () => {
        const formatted = formatRuntimeError(
            {
                name: "TypeError",
                message: "cannot read property of undefined",
                stack: "    at Main (Main.js:3:22)\n",
            },
            issueSampleMap,
        );
        expect(formatted).toBe("TypeError: cannot read property of undefined\n    at Main (Main.js:3:24)");
    });

    it("文字列 dump も remap する", () => {
        expect(formatRuntimeError("    at Main (Main.js:3:22)", issueSampleMap)).toContain("Main.js:3:24");
    });
});

describe("formatTransformError", () => {
    it("esbuild の location を at file:line:col にする", () => {
        const formatted = formatTransformError({
            errors: [
                {
                    text: "Expected identifier but found end of file",
                    location: { file: "Main.js", line: 1, column: 16, lineText: "function Main( {" },
                },
            ],
            warnings: [],
        });
        expect(formatted).toBe("Expected identifier but found end of file\n    at Main.js:1:16");
        expect(formatted).not.toContain("Transform failed");
    });

    it("errors が複数なら並べる", () => {
        const formatted = formatTransformError({
            errors: [
                { text: "first", location: { file: "Main.js", line: 1, column: 0 } },
                { text: "second", location: { file: "Main.js", line: 2, column: 3 } },
            ],
        });
        expect(formatted).toContain("first\n    at Main.js:1:0");
        expect(formatted).toContain("second\n    at Main.js:2:3");
    });

    it("構造が無い Error は message のまま", () => {
        expect(formatTransformError(new Error("Failed to inject inspect-runtime"))).toBe(
            "Failed to inject inspect-runtime",
        );
    });
});
