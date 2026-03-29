// ================================================================================================
// Monaco Editorをセットアップする
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------
import { editor as monacoEditor, typescript as monacoTS } from "monaco-editor";

type MonacoWorkerAssetPath =
    | "unlisted_monaco-ts-lib.js"
    | "unlisted_monaco-ts.js"
    | "unlisted_monaco-editor.js";

const fetchWorkerScript = async (workerPath: MonacoWorkerAssetPath) => {
    const url = browser.runtime.getURL(`/${workerPath}` as any);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Failed to load worker script: ${workerPath} (${response.status})`,
        );
    }
    return response.text();
};

// ----------------------------------------------------------------
// Monaco Editorの設定
// ----------------------------------------------------------------

// ==== Monaco Environmentの設定 (Workerの紐付け) ====
// Firefoxのセキュリティ制限(Content Scriptから拡張機能内のWorkerを直接起動できない)を回避するため、
// 一度スクリプトをfetchしてBlob URLに変換してから起動する
(self as any).MonacoEnvironment = {
    getWorker: async (_: any, label: string) => {
        if (label === "typescript" || label === "javascript") {
            const libScript = await fetchWorkerScript(
                "unlisted_monaco-ts-lib.js",
            );
            const workerScript = await fetchWorkerScript(
                "unlisted_monaco-ts.js",
            );
            const blob = new Blob([libScript, "\n", workerScript], {
                type: "application/javascript",
            });
            return new Worker(URL.createObjectURL(blob));
        }

        const workerScript = await fetchWorkerScript(
            "unlisted_monaco-editor.js",
        );
        const blob = new Blob([workerScript], {
            type: "application/javascript",
        });
        return new Worker(URL.createObjectURL(blob));
    },
};

// ==== Compiler Optionsの設定 (JS, TSのIntelliSense) ====

/** JS・TSで共通の設定 */
const commonCompilerOptions: monacoTS.CompilerOptions = {
    target: monacoTS.ScriptTarget.ESNext, // ESNextにしておけば最新の構文が使えるはず
    module: monacoTS.ModuleKind.ESNext, // ESNextにしておけばimport/exportが使えるはず
    moduleResolution: monacoTS.ModuleResolutionKind.NodeJs, // bundlerにしたいけどなさそうなのでNodeJsにする
    noEmit: true, // コード生成はしない
};

monacoTS.typescriptDefaults.setCompilerOptions({
    ...commonCompilerOptions,
    allowNonTsExtensions: true,
    strict: true,
});
monacoTS.javascriptDefaults.setCompilerOptions({
    ...commonCompilerOptions,
    allowNonTsExtensions: true,
    strict: false, // JSは厳密モードにしない
    allowJs: true,
});

// ==== Extra Libraryの設定 (入出力周りのコードで怒られないように型定義追加) ====
const extraLibs: { [fileName: string]: string } = {
    "io.d.ts": `
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
`,
};

for (const [fileName, libContent] of Object.entries(extraLibs)) {
    monacoTS.typescriptDefaults.addExtraLib(libContent, `file:///${fileName}`);
    monacoTS.javascriptDefaults.addExtraLib(libContent, `file:///${fileName}`);
}

// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------
export const setupMonacoEditor = async (container: HTMLDivElement) => {
    // ==== 保存されているコードがあればそれを取得 ====
    const codeSaveKey: `local:${string}` =
        `local:editor.code.${window.location.pathname}`;
    const savedCode = (await storage.getItem<string>(codeSaveKey)) || "";
    // ==== Monaco Editorを入れるコンテナ要素を取得 ====
    const monacoContainer = container.querySelector<HTMLDivElement>(
        "#monaco-editor-container",
    );
    if (!monacoContainer) {
        throw new Error("Monaco Editor container not found");
    }
    // ==== 言語設定を取得 (先にGlobal Settingsの設定が走っているので、DOM要素から取得してOK) ====
    const languageSelect = container.querySelector<HTMLSelectElement>(
        "#select-settings-editor-language",
    );
    const language = languageSelect?.value || "plaintext";
    // ==== Monaco Editorを初期化 ====
    const editor = monacoEditor.create(monacoContainer, {
        value: savedCode,
        language: language,
        automaticLayout: true,
        theme: "vs-dark",
        minimap: { enabled: false },
        hover: {
            enabled: true,
        },
        fontFamily: `'M PLUS 1 Code', monospace`,
        glyphMargin: true,
    });
    // ==== コード変更時に保存するように設定 ====
    editor.onDidChangeModelContent(async () => {
        const code = editor.getValue();
        await storage.setItem(codeSaveKey, code);
    });
    // ==== 言語変更時にエディタの言語を変更するように設定 ====
    languageSelect?.addEventListener("change", () => {
        const newLanguage = languageSelect.value;
        const model = editor.getModel();
        if (!model) return;
        monacoEditor.setModelLanguage(model, newLanguage);
    });
    // ==== 他の処理の都合でeditorを返す ====
    return editor;
};
