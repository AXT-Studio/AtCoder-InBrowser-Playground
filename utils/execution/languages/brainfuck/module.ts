// ================================================================================================
// Language Module - brainfuck
// ================================================================================================

import type { LanguageModule } from "../../types";
import { interpretBrainfuck } from "./interpret";

/** Language Context: 実行時に必要なコンテキスト */
export type LanguageContext = null;

/** Module */
export const brainfuck: LanguageModule<LanguageContext> = {
    async init() {
        return null;
    },
    async run(_ctx, code, stdin) {
        return interpretBrainfuck(code, stdin);
    },
};
