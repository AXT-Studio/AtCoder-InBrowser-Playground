/**
 * 入力をスキャンし、トークンを順に取得するためのクラスです。
 * - 1個受け取り: `str()`, `num()`, `bigint()`
 * - 複数(i個)受け取り:  `strs(i)`, `nums(i)`, `bigints(i)`
 * - 一括受け取り: `batch([String, Number, BigInt])`→`[string, number, bigint]`
 * ※このクラスは https://github.com/AXT-Studio/AtCoder-InBrowser-Playground (`utils/templates/ts/InputScanner.ts`) に同梱されているテンプレートコードです。このクラスとJSDocはCC0として扱ってよいです。
 */
class InputScanner {
    #target: string;
    #length: number;
    #current: number;

    /**
     * 新しいInputScannerインスタンスを生成します。
     * @param target - 読む文字列
     */
    constructor(target: string) {
        this.#target = target;
        this.#length = target.length;
        this.#current = 0;
    }

    /** ある文字がトークンの区切りとみなせる文字(' '・'\n'・'\r'・'\t')であるかを判定します。 */
    #isSpace(c: number): boolean {
        return c === 32 || c === 10 || c === 13 || c === 9;
    }

    /** #currentをトークンの区切りとみなせる文字の直後まで進めます。 */
    #skipSpaces() {
        while (this.#current < this.#length) {
            const c = this.#target.charCodeAt(this.#current);
            if (!this.#isSpace(c)) break;
            this.#current++;
        }
    }

    /** トークンを1つ取得します。もうトークンが存在しない場合、undefinedを返します。 */
    #next<T>(parse: (token: string) => T): T | undefined {
        this.#skipSpaces();
        if (this.#current >= this.#length) return undefined;
        const startIdx = this.#current;
        while (this.#current < this.#length) {
            const c = this.#target.charCodeAt(this.#current);
            if (this.#isSpace(c)) break;
            this.#current++;
        }
        return parse(this.#target.substring(startIdx, this.#current));
    }

    /**
     * トークンを1個、stringとして取得します。
     * もうトークンが存在しない場合、undefinedを返します。
     */
    str(): string | undefined {
        return this.#next((token) => token);
    }

    /**
     * トークンを1個、numberとして取得します。
     * もうトークンが存在しない場合、undefinedを返します。
     */
    num(): number | undefined {
        const token = this.#next((token) => token);
        return token === undefined ? undefined : Number(token);
    }

    /**
     * トークンを1個、bigintとして取得します。
     * もうトークンが存在しない場合、undefinedを返します。
     */
    bigint(): bigint | undefined {
        const token = this.#next((token) => token);
        return token === undefined ? undefined : BigInt(token);
    }

    /**
     * トークンを(最大)n個、stringとして取得します。
     * 残りトークンがn個に満たない場合、長さn未満のstring[]が返されます。
     */
    strs(n: number): string[] {
        const result: string[] = [];
        for (let i = 0; i < n; i++) {
            const token = this.str();
            if (token === undefined) break;
            else result.push(token);
        }
        return result;
    }

    /**
     * トークンを(最大)n個、numberとして取得します。
     * 残りトークンがn個に満たない場合、長さn未満のnumber[]が返されます。
     */
    nums(n: number): number[] {
        const result: number[] = [];
        for (let i = 0; i < n; i++) {
            const token = this.num();
            if (token === undefined) break;
            else result.push(token);
        }
        return result;
    }

    /**
     * トークンを(最大)n個、stringとして取得します。
     * 残りトークンがn個に満たない場合、長さn未満のstring[]が返されます。
     */
    bigints(n: number): bigint[] {
        const result: bigint[] = [];
        for (let i = 0; i < n; i++) {
            const token = this.bigint();
            if (token === undefined) break;
            else result.push(token);
        }
        return result;
    }

    /**
     * トークンを順にstringとして受け取り、指定したパーサーでパースした結果を返します。
     * (トークン不足を含めて)パーサーがundefinedを返した場合は、その部分がemptyとなり疎配列が返されます。
     *
     * @example
     * ```ts
     * const scanner = new InputScanner("1\n2 3\ntest");
     * const [a, b, c, s] = scanner.batch([Number, Number, Number, String]);
     * console.log(a + b + c); // => <number> 6 (※a, b, cはいずれもnumber型になっています)
     * console.log(s); // => <string> "test" (※a, b, cはいずれもstring型になっています)
     * ```
     *
     * @param parsers - トークンのパース方法(stringを取って何かを返す関数)の配列
     * @returns - 指定した方法でパースされたトークンの配列
     */
    batch<const P extends readonly ((token: string) => unknown)[]>(parsers: P): {-readonly [K in keyof P]: ReturnType<P[K]>;} {
        const result: unknown[] = [];
        for (let i = 0; i < parsers.length; i++) {
            const token = this.#next(parsers[i]);
            if (token !== undefined) result[i] = token;
        }
        return result as {-readonly [K in keyof P]: ReturnType<P[K]>;};
    }
}
