// ================================================================================================
// Brainfuck interpreter (Tritium -b -e)
// ================================================================================================

import type { LanguageRunOutcome } from "../../types";

/**
 * AtCoder ジャッジ `tritium -b -e Main.bf` に合わせたインタプリタ。
 *
 * - `-b`: セルは unsigned 8bit。`+`/`-` は wrap（255+1→0、0-1→255）
 * - `-e`: `,` が EOF のときセルへ -1 相当（8bit では 255）を入れる
 * - 8 命令 `><+-.,[]` 以外はコメント
 * - `[]` 不一致は CE、テープはみ出しは RE
 */
export const interpretBrainfuck = (code: string, stdin: string): LanguageRunOutcome => {
    // []の数の不一致を確認
    let bracketsCount = 0;
    let currentLine = 1;
    let lastLineLastLetterIndex = -1;
    for (let i = 0; i < code.length; i++) {
        const letter = code[i];
        if (letter === "[") {
            bracketsCount++;
        } else if (letter === "]") {
            bracketsCount--;
            if (bracketsCount < 0) {
                return {
                    status: "CE",
                    stdout: "",
                    stderr: `Unbalanced bracket at Line ${currentLine}, Col ${i - lastLineLastLetterIndex}.`
                };
            }
        } else if (letter === "\n") {
            currentLine++;
            lastLineLastLetterIndex = i;
        }
    }
    if (bracketsCount !== 0) {
        return {
            status: "CE",
            stdout: "",
            stderr: `Unbalanced bracket at EOF.`
        };
    }
    // 他にあり得るエラーはテープ左にはみ出すパターン(RE)かTLEにしていいパターンのどちらかだと思われるので、実行に進んで良い
    // とりあえず長さ2048のUint8Arrayを用意する (本来は30,000以上用意するものらしいが、どうせ増やせるので一旦……)
    let tape = new Uint8Array(2048);
    /** 今の長さの2倍のテープを用意して、既存の分をコピーして返す */
    const doublingTape = (old: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> => {
        const newTape = new Uint8Array(old.length * 2);
        newTape.set(old, 0);
        return newTape;
    };
    /** 次に,が来たときstdinの何文字目を読むか */
    let nextStdinIndex = 0;
    /** 出力 */
    let stdout = "";
    /** ポインタ位置 */
    let ptr = 1023;
    /** [の位置をスタック */
    const bracketStarts: number[] = [];
    for (let i = 0; i < code.length; i++) {
        switch (code[i]) {
            // > ... ポインタをインクリメント (今tape末尾なら倍増させてから)
            case ">":
                if (ptr + 1 === tape.length) tape = doublingTape(tape);
                ptr++;
                break;
            // < ... ポインタをデクリメント (-1になるならRE)
            case "<":
                if (ptr === 0) {
                    return {
                        status: "RE",
                        stdout: "",
                        stderr: "Tape pointer has moved below available space.",
                    };
                }
                ptr--;
                break;
            // + ... ポインタが指す場所をインクリメント
            case "+":
                tape[ptr]++;
                break;
            // - ... ポインタが指す場所をデクリメント
            case "-":
                tape[ptr]--;
                break;
            // , ... stdinから1文字読んでポインタが指す場所に入れる
            case ",":
                tape[ptr] = nextStdinIndex < stdin.length ? stdin.charCodeAt(nextStdinIndex) : 255;
                nextStdinIndex++;
                break;
            // . ... ポインタが指す値をASCIIコード変換して出力
            case ".":
                stdout += String.fromCharCode(tape[ptr]);
                break;
            // [ ... 今ポインタが指す値が0なら対応する]まで飛ばす 0でないなら一旦スタックに積んでおく
            case "[":
                if (tape[ptr] === 0) {
                    let bracketCount = 1;
                    for (i++; i < code.length; i++) {
                        const letter = code[i];
                        if (letter === "[") {
                            bracketCount++;
                        } else if (letter === "]") {
                            bracketCount--;
                            if (bracketCount === 0) break;
                        }
                    }
                    break;
                } else {
                    bracketStarts.push(i);
                    break;
                }
            // ] ... 今ポインタが指す値が0ならスタック1個破棄して次へ 0でないならスタック先頭の直後に戻る
            case "]":
                if (tape[ptr] === 0) {
                    bracketStarts.pop()!;
                    break;
                } else {
                    i = bracketStarts.at(-1)!; // <- 直後にforで+1されるのでこれでいいはず
                    break;
                }
            // それ以外 ... 何もしない(コメント扱い)
            default:
                break;
        }
    }
    return {
        status: "completed",
        stdout,
        stderr: ""
    };
};
