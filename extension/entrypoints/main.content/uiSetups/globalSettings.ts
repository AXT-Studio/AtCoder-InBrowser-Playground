// ================================================================================================
// entrypoints/main.content/uiSetups/globalSettings.ts
// Global SettingsのUI設定を行う
// - ロード時に保存されている設定をUIに反映する
// - UI操作時に設定を保存するようにする
// ================================================================================================
// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------

export const setupGlobalSettingsSetter = async (container: HTMLDivElement) => {
    // 反映先のDOM要素を取得
    const settingsElement = {
        editorLanguage: container.querySelector<HTMLSelectElement>("#select-settings-editor-language"),
    };
    // ==== storageに保存されている設定をUIに反映する ====
    // 設定値を取得
    const settings = {
        editorLanguage: await storage.getItem<string>("local:settings.editorLanguage"),
    };
    // 反映
    if (settingsElement.editorLanguage && settings.editorLanguage !== null) {
        settingsElement.editorLanguage.value = settings.editorLanguage;
    }
    // ==== UI操作時に設定を保存するようにする ====
    if (settingsElement.editorLanguage) {
        settingsElement.editorLanguage.addEventListener("change", async () => {
            const value = settingsElement.editorLanguage?.value;
            if (value) {
                await storage.setItem("local:settings.editorLanguage", value);
            }
        });
    }
};
