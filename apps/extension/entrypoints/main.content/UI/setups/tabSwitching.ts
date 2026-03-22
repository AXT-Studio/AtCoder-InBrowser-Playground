// ================================================================================================
// 拡張機能用のUIのDOM要素に対して、タブ切り替えのUI設定を行う。
// ================================================================================================

// ----------------------------------------------------------------
// 切り替えを行う関数
// ----------------------------------------------------------------

const switchTabs = (container: HTMLDivElement, showingTabName: string) => {
    // すべてのタブ切り替えボタン(.tab-button)から.is-activeクラスを削除
    const tabButtons = container.querySelectorAll(".tab-button");
    tabButtons.forEach((button) => {
        button.classList.remove("is-active");
    });

    // すべてのタブコンテンツ(.tab-content)から.is-activeクラスを削除
    const tabContents = container.querySelectorAll(".tab-content");
    tabContents.forEach((content) => {
        content.classList.remove("is-active");
    });

    // 表示するタブコンテンツ・選択状態にするボタンのidを作る
    const buttonId = `tab-button-${showingTabName}`;
    const contentId = `tab-content-${showingTabName}`;

    // 指定されたタブ切り替えボタンに.is-activeクラスを追加
    const targetButton = container.querySelector(`#${buttonId}`);
    if (targetButton) {
        targetButton.classList.add("is-active");
    }
    // 指定されたタブコンテンツに.is-activeクラスを追加
    const targetContent = container.querySelector(`#${contentId}`);
    if (targetContent) {
        targetContent.classList.add("is-active");
    }
};

// ----------------------------------------------------------------
// イベント設定
// ----------------------------------------------------------------

export const setupTabSwitching = async (container: HTMLDivElement) => {
    // 各タブボタンのClickイベントに切り替え処理を設定
    container.querySelector("#tab-button-operation")?.addEventListener("click", () => {
        switchTabs(container, "operation");
    });
    container.querySelector("#tab-button-test")?.addEventListener("click", () => {
        switchTabs(container, "test");
    });
    container.querySelector("#tab-button-settings")?.addEventListener("click", () => {
        switchTabs(container, "settings");
    });
    // 初期表示は"operation"タブ
    switchTabs(container, "operation");
};
