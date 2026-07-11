import { editor as monacoEditor, typescript as monacoTS, type editor } from "monaco-editor";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import "monaco-editor/min/vs/editor/editor.main.css";

type MonacoWorkerAssetPath =
    | "unlisted_monaco-ts-lib.js"
    | "unlisted_monaco-ts.js"
    | "unlisted_monaco-editor.js";

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

/** Firefox 対策: 拡張内 Worker を直接 new せず、fetch → Blob URL → Worker */
export const ensureMonacoEnvironment = (): void => {
    if (environmentConfigured) return;
    environmentConfigured = true;

    (globalThis as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
        getWorker: async (_: unknown, label: string) => {
            if (label === "typescript" || label === "javascript") {
                // 本番ビルドでは lib 分割アセットを先頭連結。dev で無い場合は worker 側に inline されたものを使う
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
                return new Worker(URL.createObjectURL(blob));
            }

            const workerScript = await fetchWorkerScript("unlisted_monaco-editor.js");
            const blob = new Blob([workerScript], { type: "application/javascript" });
            return new Worker(URL.createObjectURL(blob));
        },
    };
};

export const ensureMonacoCompilerOptions = (): void => {
    if (compilerConfigured) return;
    compilerConfigured = true;

    const commonCompilerOptions: monacoTS.CompilerOptions = {
        target: monacoTS.ScriptTarget.ESNext,
        module: monacoTS.ModuleKind.ESNext,
        moduleResolution: monacoTS.ModuleResolutionKind.NodeJs,
        noEmit: true,
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

    const extraLib = `
declare module 'fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
declare var require: {
  (moduleName: 'fs'): typeof import('fs');
};
declare namespace Deno {
  function readTextFile(path: string): Promise<string>;
}
declare namespace Bun {
  function file(path: string): {
    text(): Promise<string>;
  };
}
`;
    monacoTS.typescriptDefaults.addExtraLib(extraLib, "file:///io.d.ts");
    monacoTS.javascriptDefaults.addExtraLib(extraLib, "file:///io.d.ts");
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

export const createMonacoEditor = (options: CreateMonacoEditorOptions): editor.IStandaloneCodeEditor => {
    ensureMonacoEnvironment();
    ensureMonacoCompilerOptions();

    const instance = monacoEditor.create(options.container, {
        value: options.value,
        language: toMonacoLanguage(options.language),
        automaticLayout: true,
        theme: "vs-dark",
        minimap: { enabled: false },
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 13,
        lineHeight: 20,
        scrollBeyondLastLine: false,
        glyphMargin: false,
        padding: { top: 8, bottom: 8 },
    });

    instance.onDidChangeModelContent(() => {
        options.onChange(instance.getValue());
    });

    return instance;
};

export const setMonacoLanguage = (instance: editor.IStandaloneCodeEditor, language: string): void => {
    const model = instance.getModel();
    if (!model) return;
    monacoEditor.setModelLanguage(model, toMonacoLanguage(language));
};
