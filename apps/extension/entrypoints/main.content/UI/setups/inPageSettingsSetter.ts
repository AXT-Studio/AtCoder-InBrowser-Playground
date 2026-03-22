// ================================================================================================
// Page SettingsのUI設定を行う
// - ロード時に保存されている設定をUIに反映する
// ================================================================================================
// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------

export const setupInPageSettingsSetter = async (container: HTMLDivElement) => {
    // ==== 問題文から設定値を取得してUIに反映する ====
    // 反映先のDOM要素を取得
    const settingsElement = {
        testTimeLimit: container.querySelector<HTMLInputElement>("#input-settings-test-time-limit"),
        allowableError: container.querySelector<HTMLInputElement>(
            "#input-settings-allowable-error",
        ),
    };
    // 問題文から設定値を取得
    const settingsValue = {
        testTimeLimit: (() => {
            const problemInfoDivs = document.querySelectorAll<HTMLElement>(".row > .col-sm-12");
            for (const div of problemInfoDivs) {
                const text = div.innerText;
                const match = text.match(/実行時間制限:\s*([\d.]+)\s*sec/);
                if (match) {
                    const timeLimitSec = Number.parseFloat(match[1]);
                    if (!Number.isNaN(timeLimitSec)) {
                        return Math.ceil(timeLimitSec * 1000).toString();
                    }
                }
            }
            return (2000).toString(); // デフォルト値は2000ms
        })(),
        allowableError: (() => {
            // 今のところ固定値で1e-6を返す
            return "1e-6";
        })(),
    };
    // 反映
    if (settingsElement.testTimeLimit) {
        settingsElement.testTimeLimit.value = settingsValue.testTimeLimit;
    }
    if (settingsElement.allowableError) {
        settingsElement.allowableError.value = settingsValue.allowableError;
    }
};
