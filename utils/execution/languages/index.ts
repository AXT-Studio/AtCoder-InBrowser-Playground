import { brainfuck } from "./brainfuck/module";
import { plaintext } from "./plaintext/module";
import { python } from "./python/module";
import { typescript } from "./typescript/typescript";
import type { LanguageModule } from "../types";

export const languages: Record<string, LanguageModule<unknown>> = {
    brainfuck,
    plaintext,
    python,
    typescript,
    javascript: typescript,
};
