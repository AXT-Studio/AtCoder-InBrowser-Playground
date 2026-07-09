// ================================================================================================
// Page SettingsのUI設定を行う
// - ロード時に保存されている設定をUIに反映する
// ================================================================================================

import { parseTimeLimit } from "@/utils/atcoder/parse_timeLimit";
import { parseAllowableError } from "@/utils/atcoder/parse_allowableError";

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
        testTimeLimit: String(parseTimeLimit()),
        allowableError: parseAllowableError(),
    };
    // 反映
    if (settingsElement.testTimeLimit) {
        settingsElement.testTimeLimit.value = settingsValue.testTimeLimit;
    }
    if (settingsElement.allowableError) {
        settingsElement.allowableError.value = settingsValue.allowableError;
    }
};
