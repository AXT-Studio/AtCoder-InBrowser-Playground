import type { editor } from "monaco-editor";
import { getPageContext } from "@/utils/atcoder/pageContext";
import { insertTemplate, listTemplates } from "@/utils/templates";
import type { BufferKind } from "@/utils/persistence/editorBuffers";
import { foldClassDeclarations } from "./monaco/foldLines";
import { setEditorValueExternal } from "./monaco/setup";
import { setBufferCode } from "./state";

/** 言語変更時に選ぶデフォルトテンプレ ID */
export const defaultTemplateId = (language: string, role: BufferKind): string =>
    listTemplates(language, role)[0]?.id ?? "";

/** Template Insert ボタンの共通処理（Monaco 正本: editor へ直接書き、Signals は追従） */
export const applyTemplateInsert = (params: {
    buffer: BufferKind;
    templateKey: string;
    editor: editor.IStandaloneCodeEditor | null;
}): void => {
    if (!params.templateKey) return;
    if (!params.editor) return;

    const { contestTitle, taskTitle, taskURL } = getPageContext();
    const result = insertTemplate({
        templateKey: params.templateKey,
        contestTitle,
        taskTitle,
        taskURL,
        role: params.buffer,
        currentCode: params.editor.getValue(),
        confirm: (message) => window.confirm(message),
    });

    if (result.action === "insert") {
        setEditorValueExternal(params.editor, result.template);
        setBufferCode(params.buffer, result.template);
        foldClassDeclarations(params.editor, { delayMs: 100 });
    }
};
