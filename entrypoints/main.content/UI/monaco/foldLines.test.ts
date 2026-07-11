import { describe, expect, it } from "vitest";
import { isClassDeclarationLine } from "./foldLines";

describe("isClassDeclarationLine", () => {
    it("matches class at line start with optional indent", () => {
        expect(isClassDeclarationLine("class InputScanner {", 1)).toBe(true);
        expect(isClassDeclarationLine("    class Foo {", 1)).toBe(true);
        expect(isClassDeclarationLine("class Foo", 1)).toBe(true);
    });

    it("does not match comments or identifiers containing class", () => {
        expect(isClassDeclarationLine("// class Foo", 1)).toBe(false);
        expect(isClassDeclarationLine("const myclass = 1", 1)).toBe(false);
        expect(isClassDeclarationLine("classname", 1)).toBe(false);
        expect(isClassDeclarationLine("export class Foo", 1)).toBe(false);
    });
});
