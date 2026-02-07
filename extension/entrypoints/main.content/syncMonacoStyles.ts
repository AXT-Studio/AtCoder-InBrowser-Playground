// ================================================================================================
// entrypoints/main.content/syncMonacoStyles.ts
// Monaco Editorが<head>に注入するスタイルをShadow Root内にも同期するユーティリティ
// ================================================================================================
// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------

export const setMonacoStyleSyncer = (container: HTMLElement) => {
    const targetShadow = container.getRootNode() as ShadowRoot;
    const syncStyles = () => {
        const styles = document.querySelectorAll('style[data-name^="monaco-"], style.monaco-colors');
        styles.forEach((style) => {
            if (!targetShadow.querySelector(`style[data-source-id="${style.innerHTML.length}"]`)) {
                const newStyle = style.cloneNode(true) as HTMLStyleElement;
                // 重複追加を防ぐための印
                newStyle.setAttribute("data-source-id", style.innerHTML.length.toString());
                targetShadow.appendChild(newStyle);
            }
        });
    };

    // 初回実行
    syncStyles();

    // Monacoは動的にスタイルを追加するため、MutationObserverで<head>を監視する
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true, subtree: true });

    // 戻り値として同期関数を返す
    return syncStyles;
};
