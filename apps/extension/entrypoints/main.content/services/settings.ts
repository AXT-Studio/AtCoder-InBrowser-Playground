// ================================================================================================
// Global Settings関連
// ================================================================================================

export const getEditorLanguage = async (): Promise<string | null> => {
    return await storage.getItem<string>("local:settings.editorLanguage");
};
export const setEditorLanguage = async (language: string): Promise<void> => {
    await storage.setItem("local:settings.editorLanguage", language);
};

// ================================================================================================
// MonacoEditor関連
// ================================================================================================

export const getSavedCode = async (): Promise<string> => {
    const codeSaveKey: `local:${string}` = `local:editor.code.${window.location.pathname}`;
    const savedCode = (await storage.getItem<string>(codeSaveKey)) || "";
    return savedCode;
};
export const saveCode = async (code: string): Promise<void> => {
    const codeSaveKey: `local:${string}` = `local:editor.code.${window.location.pathname}`;
    await storage.setItem(codeSaveKey, code);
};
