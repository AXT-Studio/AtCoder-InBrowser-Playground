// ================================================================================================
// Language Module - plaintext
// ================================================================================================

import type { LanguageModule } from "../types";

/** Language Context: 実行時に必要なコンテキスト */
export type LanguageContext = null;

/** Module */
export const plaintext: LanguageModule<LanguageContext> = {
    async init() {
        return null;
    },
    async run(_ctx, code, _stdin) {
        // AtCoderの仕様は"codeを出力"なので、それに合わせます
        return {
            status: "completed",
            stdout: code,
            stderr: "",
        };
    },
};
