import { describe, expect, it } from "vitest";
import { bufferModelUri, shouldAutoFoldClasses } from "./bufferModelIds";

describe("bufferModelUri", () => {
    it("BufferKind ごとに安定した file URI を返す", () => {
        expect(bufferModelUri("submission")).toBe("file:///aibp/buffer/submission");
        expect(bufferModelUri("naive")).toBe("file:///aibp/buffer/naive");
        expect(bufferModelUri("generator")).toBe("file:///aibp/buffer/generator");
    });
});

describe("shouldAutoFoldClasses", () => {
    it("viewState が無い初回だけ折る", () => {
        expect(shouldAutoFoldClasses(false)).toBe(true);
        expect(shouldAutoFoldClasses(true)).toBe(false);
    });
});
