import { describe, expect, it } from "vitest";
import { formatRuntimeError, formatSnippet, formatTransformError, remapStack } from "./formatError";

/** generated 3:22 (1-based) → original 3:24 になる最小 decoded map */
const issueSampleMap = JSON.stringify({
    version: 3,
    sources: ["Main.js"],
    names: [],
    mappings: [[], [], [[21, 0, 2, 23]]],
});

const issueSource = `function Main(): void {
    const arr = Array.from({length: 10}, (_, i) => Array.from({length: 10}, (_, j) => i * j));
    console.log(arr[10][1]);
}
Main();
`;

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

describe("formatSnippet", () => {
    it("1 桁行で prefix 幅込みの caret が列に合う", () => {
        const snippet = formatSnippet("ab\ncd\nhello", 3, 5);
        expect(snippet).toBe("3 | hello\n        ^");
    });

    it("2 桁行で prefix 幅込みの caret が列に合う", () => {
        const source = Array.from({ length: 10 }, (_, i) => (i === 9 ? "abcde" : "x")).join("\n");
        const snippet = formatSnippet(source, 10, 3);
        expect(snippet).toBe("10 | abcde\n       ^");
    });

    it("行がソースに無いときは undefined", () => {
        expect(formatSnippet("a\nb", 3, 1)).toBeUndefined();
        expect(formatSnippet("a", 0, 1)).toBeUndefined();
    });

    it("列が行末より右なら snippet のみで caret なし", () => {
        expect(formatSnippet("abc", 1, 4)).toBe("1 | abc");
        expect(formatSnippet("abc", 1, 4)?.includes("^")).toBe(false);
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
        expect(formatted).not.toContain(" | ");
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

    it("remap できれば snippet と caret を先頭に付ける", () => {
        const formatted = formatRuntimeError(
            {
                name: "TypeError",
                message: "cannot read property of undefined",
                stack: "    at Main (Main.js:3:22)\n",
            },
            issueSampleMap,
            issueSource,
        );
        expect(formatted.startsWith("3 |     console.log(arr[10][1]);")).toBe(true);
        expect(formatted).toContain("^");
        expect(formatted).toContain("TypeError: cannot read property of undefined");
        expect(formatted).toContain("Main.js:3:24");
    });

    it("remap できないときは snippet も caret も出さない", () => {
        const formatted = formatRuntimeError(
            {
                name: "TypeError",
                message: "cannot read property of undefined",
                stack: "    at Main (Main.js:9:1)\n",
            },
            issueSampleMap,
            issueSource,
        );
        expect(formatted).not.toContain(" | ");
        expect(formatted).not.toContain("^");
        expect(formatted).toContain("TypeError:");
    });

    it("文字列 dump も remap する", () => {
        expect(formatRuntimeError("    at Main (Main.js:3:22)", issueSampleMap)).toContain("Main.js:3:24");
    });
});

describe("formatTransformError", () => {
    const ceSource = "function Main( {";

    it("esbuild の location を 1-based の at file:line:col にする", () => {
        const formatted = formatTransformError(
            {
                errors: [
                    {
                        text: "Expected identifier but found end of file",
                        location: { file: "Main.js", line: 1, column: 16, lineText: "function Main( {" },
                    },
                ],
                warnings: [],
            },
            ceSource,
        );
        expect(formatted).toContain("1 | function Main( {");
        expect(formatted).not.toContain("^");
        expect(formatted).toContain("Expected identifier but found end of file");
        expect(formatted).toContain("at Main.js:1:17");
        expect(formatted).not.toContain("Transform failed");
    });

    it("有効な列なら CE にも caret を付ける", () => {
        const formatted = formatTransformError(
            {
                errors: [
                    {
                        text: "Unexpected identifier",
                        location: { file: "Main.js", line: 1, column: 0 },
                    },
                ],
            },
            "hello",
        );
        expect(formatted).toBe("1 | hello\n    ^\nUnexpected identifier\n    at Main.js:1:1");
    });

    it("errors が複数なら各ブロックに snippet を付ける", () => {
        const formatted = formatTransformError(
            {
                errors: [
                    { text: "first", location: { file: "Main.js", line: 1, column: 0 } },
                    { text: "second", location: { file: "Main.js", line: 2, column: 3 } },
                ],
            },
            "abcd\nefghij",
        );
        expect(formatted).toContain("1 | abcd");
        expect(formatted).toContain("2 | efghij");
        expect(formatted).toContain("first");
        expect(formatted).toContain("at Main.js:1:1");
        expect(formatted).toContain("second");
        expect(formatted).toContain("at Main.js:2:4");
    });

    it("構造が無い Error は message のまま", () => {
        expect(formatTransformError(new Error("Failed to inject inspect-runtime"), "code")).toBe(
            "Failed to inject inspect-runtime",
        );
    });
});
