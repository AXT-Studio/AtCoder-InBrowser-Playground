import { plaintext } from "./plaintext/module";
import { python } from "./python/module";
import { typescript } from "./typescript/typescript";
import type { LanguageModule } from "../types";

export const languages: Record<string, LanguageModule<unknown>> = {
    plaintext,
    python,
    typescript,
    javascript: typescript,
};
