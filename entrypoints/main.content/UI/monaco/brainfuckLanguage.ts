import { languages } from "monaco-editor";

let registered = false;

/** Brainfuck の Monarch tokenizer と括弧対応。モデル作成前に一度呼べばよい。 */
export const ensureBrainfuckLanguage = (): void => {
    if (registered) return;
    registered = true;

    languages.register({ id: "brainfuck" });
    languages.setMonarchTokensProvider("brainfuck", {
        brackets: [{ open: "[", close: "]", token: "delimiter.bracket" }],
        tokenizer: {
            root: [
                [/[><]/, "keyword"],
                [/[+-]/, "operator"],
                [/[.,]/, "string"],
                // oxlint-disable-next-line no-useless-escape
                [/[\[\]]/, "@brackets"],
                [/[^><+\-.,[\]]+/, "comment"],
            ],
        },
    });
    languages.setLanguageConfiguration("brainfuck", {
        brackets: [["[", "]"]],
        autoClosingPairs: [{ open: "[", close: "]" }],
        surroundingPairs: [{ open: "[", close: "]" }],
    });
};
