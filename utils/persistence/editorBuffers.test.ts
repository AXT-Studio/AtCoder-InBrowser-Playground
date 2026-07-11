import { describe, expect, it } from "vitest";
import { bufferCodeStorageKey, legacySubmissionCodeStorageKey } from "./editorBuffers";

describe("bufferCodeStorageKey", () => {
    it("pathname 付きのコードキーを返す", () => {
        expect(bufferCodeStorageKey("submission", "/contests/abc999/tasks/abc999_a")).toBe(
            "local:buffer.submission.code./contests/abc999/tasks/abc999_a",
        );
        expect(bufferCodeStorageKey("naive", "/contests/abc999/tasks/abc999_a")).toBe(
            "local:buffer.naive.code./contests/abc999/tasks/abc999_a",
        );
        expect(bufferCodeStorageKey("generator", "/x")).toBe("local:buffer.generator.code./x");
    });
});

describe("legacySubmissionCodeStorageKey", () => {
    it("旧実装の提出用コードキーを返す", () => {
        expect(legacySubmissionCodeStorageKey("/contests/abc999/tasks/abc999_a")).toBe(
            "local:editor.code./contests/abc999/tasks/abc999_a",
        );
    });
});
