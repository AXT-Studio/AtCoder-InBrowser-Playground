import { signal } from "@preact/signals";
import { parseAllowableError } from "@/utils/atcoder/parseAllowableError";
import { parseTimeLimit } from "@/utils/atcoder/parseTimeLimit";
import {
    DEFAULT_EDITOR_LANGUAGE,
    loadBufferCode,
    loadEditorLanguage,
    saveBufferCode,
    saveEditorLanguage,
    type BufferKind,
} from "@/utils/persistence/editorBuffers";

export type Mode = "solve" | "compare" | "stress";
export const mode = signal<Mode>("solve");

/** 提出用 / 愚直 / 生成器。mode 切替でも保持する */
export const submissionCode = signal("");
export const naiveCode = signal("");
export const generatorCode = signal("");

/** 言語は拡張全体で共通（ページ非依存）。デフォルトは typescript */
export const submissionLanguage = signal(DEFAULT_EDITOR_LANGUAGE);
export const naiveLanguage = signal(DEFAULT_EDITOR_LANGUAGE);
export const generatorLanguage = signal(DEFAULT_EDITOR_LANGUAGE);

/**
 * ページロード時に DOM から一度だけ初期化した TL / eps。
 * 各 mode の欄が同じ signal を参照する（タブ切替で再パースしない）。
 */
export const timeLimitMs = signal(parseTimeLimit());
export const epsExponent = signal(parseAllowableError());

/** storage からの初回読み込みが終わったか（二重 hydrate 防止） */
export const editorBuffersHydrated = signal(false);

const CODE_SAVE_DEBOUNCE_MS = 300;
const codeSaveTimers: Partial<Record<BufferKind, ReturnType<typeof setTimeout>>> = {};

const codeSignalFor = (kind: BufferKind) => {
    switch (kind) {
        case "submission":
            return submissionCode;
        case "naive":
            return naiveCode;
        case "generator":
            return generatorCode;
    }
};

const languageSignalFor = (kind: BufferKind) => {
    switch (kind) {
        case "submission":
            return submissionLanguage;
        case "naive":
            return naiveLanguage;
        case "generator":
            return generatorLanguage;
    }
};

/** 拡張 storage からコード・言語を Signals に載せる（App 起動時に一度） */
export const hydrateEditorBuffers = async (): Promise<void> => {
    if (editorBuffersHydrated.value) return;

    const kinds: BufferKind[] = ["submission", "naive", "generator"];
    await Promise.all(
        kinds.map(async (kind) => {
            const [code, language] = await Promise.all([loadBufferCode(kind), loadEditorLanguage(kind)]);
            codeSignalFor(kind).value = code;
            languageSignalFor(kind).value = language;
        }),
    );

    editorBuffersHydrated.value = true;
};

/** コード変更を debounce して保存 */
export const setBufferCode = (kind: BufferKind, code: string): void => {
    codeSignalFor(kind).value = code;
    const prev = codeSaveTimers[kind];
    if (prev !== undefined) clearTimeout(prev);
    codeSaveTimers[kind] = setTimeout(() => {
        void saveBufferCode(kind, code);
        delete codeSaveTimers[kind];
    }, CODE_SAVE_DEBOUNCE_MS);
};

/** 言語変更を即保存（拡張全体共通） */
export const setBufferLanguage = (kind: BufferKind, language: string): void => {
    languageSignalFor(kind).value = language;
    void saveEditorLanguage(kind, language);
};
