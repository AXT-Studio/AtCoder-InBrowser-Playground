import { editor as monacoEditor, Uri, type editor } from "monaco-editor";
import type { BufferKind } from "@/utils/persistence/editorBuffers";
import { bufferModelUri } from "./bufferModelIds";
import { toMonacoLanguage } from "./setup";

export { bufferModelUri, shouldAutoFoldClasses } from "./bufferModelIds";

const models = new Map<BufferKind, editor.ITextModel>();
const viewStates = new Map<BufferKind, editor.ICodeEditorViewState>();

export const hasBufferViewState = (kind: BufferKind): boolean => viewStates.has(kind);

export const getOrCreateBufferModel = (
    kind: BufferKind,
    options: { value: string; language: string },
): editor.ITextModel => {
    const existing = models.get(kind);
    if (existing && !existing.isDisposed()) {
        return existing;
    }

    const uri = Uri.parse(bufferModelUri(kind));
    const already = monacoEditor.getModel(uri);
    const model =
        already && !already.isDisposed()
            ? already
            : monacoEditor.createModel(options.value, toMonacoLanguage(options.language), uri);
    models.set(kind, model);
    return model;
};

export const saveBufferViewState = (kind: BufferKind, instance: editor.IStandaloneCodeEditor): void => {
    const state = instance.saveViewState();
    if (state) {
        viewStates.set(kind, state);
    }
};

export const restoreBufferViewState = (kind: BufferKind, instance: editor.IStandaloneCodeEditor): void => {
    const state = viewStates.get(kind);
    if (!state) return;
    instance.restoreViewState(state);
};
