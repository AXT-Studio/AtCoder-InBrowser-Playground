import { plaintext } from "./plaintext";
import type { LanguageModule } from "../types";

export const languages: Record<string, LanguageModule<unknown>> = {
    plaintext,
};
