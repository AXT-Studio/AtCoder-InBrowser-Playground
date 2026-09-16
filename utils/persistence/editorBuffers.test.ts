import { afterEach, describe, expect, it } from "vitest";
import { storage } from "wxt/utils/storage";
import {
    bufferCodeStorageKey,
    LEGACY_COMPARE_LANGUAGE_KEY,
    legacyCompareCodeStorageKey,
    legacySubmissionCodeStorageKey,
    loadBufferCode,
    loadEditorLanguage,
} from "./editorBuffers";

const PATHNAME = "/contests/abc999/tasks/abc999_a";

describe("bufferCodeStorageKey", () => {
    it("pathname 付きのコードキーを返す", () => {
        expect(bufferCodeStorageKey("submission", PATHNAME)).toBe(`local:buffer.submission.code.${PATHNAME}`);
        expect(bufferCodeStorageKey("compare", PATHNAME)).toBe(`local:buffer.compare.code.${PATHNAME}`);
        expect(bufferCodeStorageKey("generator", "/x")).toBe("local:buffer.generator.code./x");
    });
});

describe("legacySubmissionCodeStorageKey", () => {
    it("旧実装の提出用コードキーを返す", () => {
        expect(legacySubmissionCodeStorageKey(PATHNAME)).toBe(`local:editor.code.${PATHNAME}`);
    });
});

describe("legacyCompareCodeStorageKey", () => {
    it("旧 naive バッファのコードキーを返す", () => {
        expect(legacyCompareCodeStorageKey(PATHNAME)).toBe(`local:buffer.naive.code.${PATHNAME}`);
    });
});

describe("loadBufferCode compare migration", () => {
    afterEach(async () => {
        await storage.removeItem(bufferCodeStorageKey("compare", PATHNAME));
        await storage.removeItem(legacyCompareCodeStorageKey(PATHNAME));
    });

    it("旧 naive キーを compare へ移して消す", async () => {
        const legacyKey = legacyCompareCodeStorageKey(PATHNAME);
        const newKey = bufferCodeStorageKey("compare", PATHNAME);
        await storage.setItem(legacyKey, "old naive code");

        const code = await loadBufferCode("compare", PATHNAME);
        expect(code).toBe("old naive code");
        expect(await storage.getItem(newKey)).toBe("old naive code");
        expect(await storage.getItem(legacyKey)).toBeNull();
    });

    it("新キーがあるときは旧キーを触らない", async () => {
        const legacyKey = legacyCompareCodeStorageKey(PATHNAME);
        const newKey = bufferCodeStorageKey("compare", PATHNAME);
        await storage.setItem(newKey, "new compare code");
        await storage.setItem(legacyKey, "old naive code");

        const code = await loadBufferCode("compare", PATHNAME);
        expect(code).toBe("new compare code");
        expect(await storage.getItem(legacyKey)).toBe("old naive code");
    });
});

describe("loadEditorLanguage compare migration", () => {
    afterEach(async () => {
        await storage.removeItem("local:compareEditorLanguage");
        await storage.removeItem(LEGACY_COMPARE_LANGUAGE_KEY);
    });

    it("旧 naive 言語キーを compare へ移して消す", async () => {
        await storage.setItem(LEGACY_COMPARE_LANGUAGE_KEY, "python");

        const language = await loadEditorLanguage("compare");
        expect(language).toBe("python");
        expect(await storage.getItem("local:compareEditorLanguage")).toBe("python");
        expect(await storage.getItem(LEGACY_COMPARE_LANGUAGE_KEY)).toBeNull();
    });

    it("新キーがあるときは旧キーを触らない", async () => {
        await storage.setItem("local:compareEditorLanguage", "ruby");
        await storage.setItem(LEGACY_COMPARE_LANGUAGE_KEY, "python");

        const language = await loadEditorLanguage("compare");
        expect(language).toBe("ruby");
        expect(await storage.getItem(LEGACY_COMPARE_LANGUAGE_KEY)).toBe("python");
    });
});
