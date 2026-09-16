import { brainfuck } from "./brainfuck/module";
import { cpp } from "./cpp/module";
import { lua } from "./lua/module";
import { plaintext } from "./plaintext/module";
import { python } from "./python/module";
import { ruby } from "./ruby/module";
import { typescript } from "./typescript/typescript";
import type { LanguageModule } from "../types";

export const languages: Record<string, LanguageModule<unknown>> = {
    brainfuck,
    cpp,
    lua,
    plaintext,
    python,
    ruby,
    typescript,
    javascript: typescript,
};
