import { editor as monacoEditor, typescript as monacoTS, type editor } from "monaco-editor";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import "monaco-editor/min/vs/editor/editor.main.css";
import runtimeExtraLib from "./extraLibs/runtime.ts?raw";

type MonacoWorkerAssetPath = "unlisted_monaco-ts-lib.js" | "unlisted_monaco-ts.js" | "unlisted_monaco-editor.js";

const fetchWorkerScript = async (workerPath: MonacoWorkerAssetPath): Promise<string> => {
    const url = browser.runtime.getURL(`/${workerPath}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load worker script: ${workerPath} (${response.status})`);
    }
    return response.text();
};

let environmentConfigured = false;
let compilerConfigured = false;

/** Worker スクリプトは一度だけ fetch → Blob URL 化（再生成ループでメモリが溶けるのを防ぐ） */
let tsWorkerBlobUrlPromise: Promise<string> | null = null;
let editorWorkerBlobUrlPromise: Promise<string> | null = null;

const getTsWorkerBlobUrl = (): Promise<string> => {
    if (!tsWorkerBlobUrlPromise) {
        tsWorkerBlobUrlPromise = (async () => {
            let libScript = "";
            try {
                libScript = await fetchWorkerScript("unlisted_monaco-ts-lib.js");
            } catch {
                libScript = "";
            }
            const workerScript = await fetchWorkerScript("unlisted_monaco-ts.js");
            const blob = new Blob([libScript ? `${libScript}\n${workerScript}` : workerScript], {
                type: "application/javascript",
            });
            return URL.createObjectURL(blob);
        })();
    }
    return tsWorkerBlobUrlPromise;
};

const getEditorWorkerBlobUrl = (): Promise<string> => {
    if (!editorWorkerBlobUrlPromise) {
        editorWorkerBlobUrlPromise = (async () => {
            const workerScript = await fetchWorkerScript("unlisted_monaco-editor.js");
            const blob = new Blob([workerScript], { type: "application/javascript" });
            return URL.createObjectURL(blob);
        })();
    }
    return editorWorkerBlobUrlPromise;
};

/** Firefox 対策: 拡張内 Worker を直接 new せず、fetch → Blob URL → Worker */
export const ensureMonacoEnvironment = (): void => {
    if (environmentConfigured) return;
    environmentConfigured = true;

    (globalThis as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
        getWorker: async (_: unknown, label: string) => {
            if (label === "typescript" || label === "javascript") {
                return new Worker(await getTsWorkerBlobUrl());
            }
            return new Worker(await getEditorWorkerBlobUrl());
        },
    };
};

export const ensureMonacoCompilerOptions = (): void => {
    if (compilerConfigured) return;
    compilerConfigured = true;

    /**
     * DOM lib は入れない（補完が重くなる）。
     * Monaco では `lib` 名は小文字で渡す（`ESNext` だと解決に失敗し Set 等まで消える）。
     * `esnext` は内部で es2024… へ reference される。
     */
    const commonCompilerOptions: monacoTS.CompilerOptions = {
        target: monacoTS.ScriptTarget.ESNext,
        module: monacoTS.ModuleKind.ESNext,
        moduleResolution: monacoTS.ModuleResolutionKind.NodeJs,
        lib: ["esnext"],
        noEmit: true,
        skipLibCheck: true,
    };

    monacoTS.typescriptDefaults.setCompilerOptions({
        ...commonCompilerOptions,
        allowNonTsExtensions: true,
        strict: true,
    });
    monacoTS.javascriptDefaults.setCompilerOptions({
        ...commonCompilerOptions,
        allowNonTsExtensions: true,
        strict: false,
        allowJs: true,
    });

    // 補完・診断の過剰更新を抑える（完全オフにはしない）
    monacoTS.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        onlyVisible: true,
    });
    monacoTS.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        onlyVisible: true,
    });

    // DOM を外すと console も消えるので、競プロで使う分だけ足す（旧実装と同様）
    monacoTS.typescriptDefaults.addExtraLib(runtimeExtraLib, "file:///aibp-runtime.d.ts");
    monacoTS.javascriptDefaults.addExtraLib(runtimeExtraLib, "file:///aibp-runtime.d.ts");
};

/** UI の language option → Monaco language id */
export const toMonacoLanguage = (language: string): string => {
    switch (language) {
        case "javascript":
        case "typescript":
        case "python":
        case "plaintext":
            return language;
        default:
            return "plaintext";
    }
};

export type CreateMonacoEditorOptions = {
    container: HTMLElement;
    value: string;
    language: string;
    onChange: (value: string) => void;
};

const MONACO_FONT_FAMILY = "'M PLUS 1 Code', ui-monospace, monospace";
const MONACO_FONT_SIZE = 13;

/**
 * Google Fonts（display=swap）完了前に測ると spaceWidth がフォールバック幅でキャッシュされ、
 * indent guide が本文からずれる（#82）。ロード後に再計測する。
 */
const remeasureMonacoFontsWhenReady = (): void => {
    void (async () => {
        try {
            await document.fonts.load(`${MONACO_FONT_SIZE}px "M PLUS 1 Code"`);
        } catch {
            // フォント取得失敗時も ready 後の再計測でフォールバック幅を確定させる
        }
        await document.fonts.ready;
        monacoEditor.remeasureFonts();
    })();
};

export const createMonacoEditor = (options: CreateMonacoEditorOptions): editor.IStandaloneCodeEditor => {
    ensureMonacoEnvironment();
    ensureMonacoCompilerOptions();

    const instance = monacoEditor.create(options.container, {
        value: options.value,
        language: toMonacoLanguage(options.language),
        automaticLayout: true,
        theme: "vs-dark",
        minimap: { enabled: false }, // <- これをfalseにしないとFirefoxで動作しないっぽい
        fontFamily: MONACO_FONT_FAMILY,
        fontSize: MONACO_FONT_SIZE,
        lineHeight: 20,
        scrollBeyondLastLine: false,
        glyphMargin: true,
        padding: { top: 8, bottom: 8 },
        // 単語ベース補完は TS 補完と二重で重いので切る
        wordBasedSuggestions: "off",
        quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
        },
        suggestSelection: "first",
    });

    // setValue 起因の onDidChange で Signals 往復しないようにする
    let suppressChangeEvent = false;

    instance.onDidChangeModelContent(() => {
        if (suppressChangeEvent) return;
        options.onChange(instance.getValue());
    });

    const originalSetValue = instance.setValue.bind(instance);
    (instance as editor.IStandaloneCodeEditor & { __aibpSetValue?: typeof originalSetValue }).__aibpSetValue = (
        value: string,
    ) => {
        suppressChangeEvent = true;
        try {
            originalSetValue(value);
        } finally {
            suppressChangeEvent = false;
        }
    };

    remeasureMonacoFontsWhenReady();

    return instance;
};

/** 外部からのコード同期（Insert / hydrate）。onChange を発火させない */
export const setEditorValueExternal = (instance: editor.IStandaloneCodeEditor, value: string): void => {
    const withHook = instance as editor.IStandaloneCodeEditor & {
        __aibpSetValue?: (value: string) => void;
    };
    if (withHook.__aibpSetValue) {
        withHook.__aibpSetValue(value);
    } else {
        instance.setValue(value);
    }
};

export const setMonacoLanguage = (instance: editor.IStandaloneCodeEditor, language: string): void => {
    const model = instance.getModel();
    if (!model) return;
    monacoEditor.setModelLanguage(model, toMonacoLanguage(language));
};
