import { plaintext } from "./plaintext/module";
import { typescript } from "./typescript/typescript";
import type { LanguageModule } from "../types";

export const languages: Record<string, LanguageModule<unknown>> = {
    plaintext,
    typescript,
    javascript: typescript,
};
