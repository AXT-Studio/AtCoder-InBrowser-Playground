export const AIBP_MAIN_NAME = "aibp_main";

/** Itanium: `int ${name}()` */
export const mangleItaniumVoidFn = (name: string): string => `_Z${name.length}${name}v`;

export const AIBP_MAIN_SYMBOL = mangleItaniumVoidFn(AIBP_MAIN_NAME);

const MAIN_DECL_RE = /\bint\s+main\s*\([^)]*\)/;

const needsIostreamFlush = (source: string): boolean =>
    /iostream|bits\/stdc\+\+\.h|\bcin\b|\bcout\b|\bcerr\b/.test(source);

export type WrapMainResult =
    | { ok: true; source: string; entryName: string; symbol: string }
    | { ok: false; reason: string };

/**
 * ユーザーの `int main` を一意な `aibp_main_*` にリネームする。
 * clang-repl は増分なので、同じ識別子を二度定義できない。
 * グローバル文として `main()` を走らせると wasm EH で落ちるので、JS から export を呼ぶ。
 */
export const wrapMain = (source: string, entryName: string = AIBP_MAIN_NAME): WrapMainResult => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entryName)) {
        return { ok: false, reason: "invalid entry name" };
    }
    if (!MAIN_DECL_RE.test(source)) {
        return { ok: false, reason: "int main() was not found" };
    }

    const withIos = needsIostreamFlush(source);
    let replaced = false;
    let prepared = source.replace(MAIN_DECL_RE, () => {
        replaced = true;
        return `int ${entryName}()`;
    });
    if (!replaced) {
        return { ok: false, reason: "int main() was not found" };
    }

    const preamble = withIos ? `#include <cstdio>\n#include <iostream>\n` : `#include <cstdio>\n`;
    prepared = `${preamble}${prepared}`;

    const openRe = new RegExp(`int ${entryName}\\s*\\(\\s*\\)\\s*\\{`);
    if (!openRe.test(prepared)) {
        return { ok: false, reason: "failed to wrap int main()" };
    }

    const flushIos = withIos ? " std::cout.flush(); std::cerr.flush();" : "";
    const cinClear = withIos ? "\n    std::cin.clear();" : "";
    const injected = prepared.replace(openRe, (open) => {
        return `${open}
    struct AibpFlush {
        ~AibpFlush() {
            std::fflush(stdout);
            std::fflush(stderr);${flushIos}
        }
    } aibp_flush;
    std::clearerr(stdin);${cinClear}`;
    });

    return { ok: true, source: injected, entryName, symbol: mangleItaniumVoidFn(entryName) };
};
