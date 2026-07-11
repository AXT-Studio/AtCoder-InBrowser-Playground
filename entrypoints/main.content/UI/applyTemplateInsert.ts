import { getPageContext } from "@/utils/atcoder/pageContext";
import { insertTemplate, listTemplates } from "@/utils/templates";
import type { BufferKind } from "@/utils/persistence/editorBuffers";
import { setBufferCode } from "./state";

/** 言語変更時に選ぶデフォルトテンプレ ID */
export const defaultTemplateId = (language: string, role: BufferKind): string =>
    listTemplates(language, role)[0]?.id ?? "";

/** Template Insert ボタンの共通処理 */
export const applyTemplateInsert = (params: { buffer: BufferKind; templateKey: string; currentCode: string }): void => {
    if (!params.templateKey) return;

    const { contestTitle, taskTitle, taskURL } = getPageContext();
    const result = insertTemplate({
        templateKey: params.templateKey,
        contestTitle,
        taskTitle,
        taskURL,
        role: params.buffer,
        currentCode: params.currentCode,
        confirm: (message) => window.confirm(message),
    });

    if (result.action === "insert") {
        setBufferCode(params.buffer, result.template);
    }
};
