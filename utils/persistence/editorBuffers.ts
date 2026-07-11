import { storage } from "wxt/utils/storage";

export type BufferKind = "submission" | "naive" | "generator";

const LANGUAGE_KEYS = {
    submission: "local:submissionEditorLanguage",
    naive: "local:naiveEditorLanguage",
    generator: "local:generatorEditorLanguage",
} as const satisfies Record<BufferKind, `local:${string}`>;

/** 問題ページ pathname 付きのコード保存キー */
export const bufferCodeStorageKey = (kind: BufferKind, pathname: string = location.pathname): `local:${string}` =>
    `local:buffer.${kind}.code.${pathname}`;

/** 旧実装の提出用コードキー（刷新時に submission へ移行） */
export const legacySubmissionCodeStorageKey = (pathname: string = location.pathname): `local:${string}` =>
    `local:editor.code.${pathname}`;

export const DEFAULT_EDITOR_LANGUAGE = "typescript";

export const loadEditorLanguage = async (kind: BufferKind): Promise<string> => {
    const value = await storage.getItem<string>(LANGUAGE_KEYS[kind]);
    return value && value.length > 0 ? value : DEFAULT_EDITOR_LANGUAGE;
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

    return "";
};

export const saveBufferCode = async (
    kind: BufferKind,
    code: string,
    pathname: string = location.pathname,
): Promise<void> => {
    await storage.setItem(bufferCodeStorageKey(kind, pathname), code);
};
