import { storage } from "wxt/utils/storage";

export type BufferKind = "submission" | "compare" | "generator";

const LANGUAGE_KEYS = {
    submission: "local:submissionEditorLanguage",
    compare: "local:compareEditorLanguage",
    generator: "local:generatorEditorLanguage",
} as const satisfies Record<BufferKind, `local:${string}`>;

/** 旧 naive バッファの言語キー（compare へ移行） */
export const LEGACY_COMPARE_LANGUAGE_KEY = "local:naiveEditorLanguage" as const;

/** 問題ページ pathname 付きのコード保存キー */
export const bufferCodeStorageKey = (kind: BufferKind, pathname: string = location.pathname): `local:${string}` =>
    `local:buffer.${kind}.code.${pathname}`;

/** 旧実装の提出用コードキー（刷新時に submission へ移行） */
export const legacySubmissionCodeStorageKey = (pathname: string = location.pathname): `local:${string}` =>
    `local:editor.code.${pathname}`;

/** 旧 naive バッファのコードキー（compare へ移行） */
export const legacyCompareCodeStorageKey = (pathname: string = location.pathname): `local:${string}` =>
    `local:buffer.naive.code.${pathname}`;

export const DEFAULT_EDITOR_LANGUAGE = "typescript";

export const loadEditorLanguage = async (kind: BufferKind): Promise<string> => {
    const key = LANGUAGE_KEYS[kind];
    const value = await storage.getItem<string>(key);
    if (value && value.length > 0) {
        return value;
    }

    if (kind === "compare") {
        const legacy = await storage.getItem<string>(LEGACY_COMPARE_LANGUAGE_KEY);
        if (legacy && legacy.length > 0) {
            await storage.setItem(key, legacy);
            await storage.removeItem(LEGACY_COMPARE_LANGUAGE_KEY);
            return legacy;
        }
    }

    return DEFAULT_EDITOR_LANGUAGE;
};

export const saveEditorLanguage = async (kind: BufferKind, language: string): Promise<void> => {
    await storage.setItem(LANGUAGE_KEYS[kind], language);
};

export const loadBufferCode = async (kind: BufferKind, pathname: string = location.pathname): Promise<string> => {
    const key = bufferCodeStorageKey(kind, pathname);
    const value = await storage.getItem<string>(key);
    if (value != null) {
        return value;
    }

    // 提出用のみ: 旧 `local:editor.code.${pathname}` があれば新キーへ移す
    if (kind === "submission") {
        const legacyKey = legacySubmissionCodeStorageKey(pathname);
        const legacy = await storage.getItem<string>(legacyKey);
        if (legacy != null) {
            await storage.setItem(key, legacy);
            await storage.removeItem(legacyKey);
            return legacy;
        }
    }

    // 比較バッファ: 旧 `local:buffer.naive.code.${pathname}` があれば新キーへ移す
    if (kind === "compare") {
        const legacyKey = legacyCompareCodeStorageKey(pathname);
        const legacy = await storage.getItem<string>(legacyKey);
        if (legacy != null) {
            await storage.setItem(key, legacy);
            await storage.removeItem(legacyKey);
            return legacy;
        }
    }

    return "";
};

export const saveBufferCode = async (
    kind: BufferKind,
    code: string,
    pathname: string = location.pathname,
): Promise<void> => {
    await storage.setItem(bufferCodeStorageKey(kind, pathname), code);
};
