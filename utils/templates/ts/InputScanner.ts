/**
 * 入力をスキャンし、トークンを順に取得するためのクラスです。
 * - .str()で文字列、.num()で浮動小数点数、.int()で整数、.bigint()でBigIntとして取得できます。
 * - 引数なしだと1つ、引数1つ(n)だと最大長さnの配列、引数2つ(n, g)だと長さgの最大長さnの配列の配列として取得できます。
 */
class InputScanner {
    #str: string;
    #len: number;
    #idx: number;

    /** 新しい入力スキャナーインスタンスを生成します。 */
    constructor(str: string) {
        this.#str = str;
        this.#len = str.length;
        this.#idx = 0;
    }
    /** ある文字がトークンの区切りとみなせる文字(' '・'\n'・'\r'・'\t')であるかを判定します。 */
    #isSpace(c: number): boolean {
        return c === 32 || c === 10 || c === 13 || c === 9;
    }
    /** #idxをトークンの区切りとみなせる文字の直後まで進めます。 */
    #skipSpaces() {
        while (this.#idx < this.#len) {
            const c = this.#str.charCodeAt(this.#idx);
            if (!this.#isSpace(c)) break;
            this.#idx++;
        }
    }

    #read<T>(fn: (token: string) => T): T | undefined;
    #read<T>(fn: (token: string) => T, n: number): T[];
    #read<T>(fn: (token: string) => T, n: number, g: number): T[][];
    /**
     * @private
     * トークンを読んだうえで、そのトークンを渡された関数に通して変換して返します。
     * @param fn - トークンを変換する関数
     * @param n - 取得するトークンの最大数
     * @param g - トークンのグループ数(トークンいくつで1巡するか)
     */
    #read<T>(fn: (token: string) => T, n?: number, g?: number): T | T[] | T[][] | undefined {
        // nがない場合: 1トークン読む
        if (n == null) {
            this.#skipSpaces();
            if (this.#idx >= this.#len) return undefined;
            const startIdx = this.#idx;
            while (this.#idx < this.#len) {
                const c = this.#str.charCodeAt(this.#idx);
                if (this.#isSpace(c)) break;
                this.#idx++;
            }
            const token = this.#str.substring(startIdx, this.#idx);
            return fn(token);
        }
        // nだけある場合: nトークン読む
        else if (g == null) {
            const result: T[] = [];
            for (let i = 0; i < n; i++) {
                const token = this.#read(fn);
                if (token == null) break;
                result.push(token);
            }
            return result;
        }
        // nもgもある場合: n×gトークン読む
        else {
            const result: T[][] = Array.from({ length: g }, () => []);
            read: for (let i = 0; i < n; i++) {
                for (let j = 0; j < g; j++) {
                    const token = this.#read(fn);
                    if (token == null) break read;
                    result[j].push(token);
                }
            }
            return result;
        }
    }
    /**
     * トークンを1つ、stringとして取得します。
     * - もうトークンが存在しない場合、undefinedを返します。
     */
    str(): string | undefined;
    /**
     * トークンを(最大)n個、string[]として取得します。
     * - 残りトークンがn個に満たない場合、長さn未満のstring[]が返されます。
     * @param n 取得するトークンの最大数
     */
    str(n: number): string[];
    /**
     * トークンを(最大)n×g個、string[][]として取得します。
     * - 戻り値のi(0≦i<g)番目の配列は、残存トークンのうちi番目, g+i番目, 2g+i番目, ..., (n-1)g+i番目のトークンを順に取得したstring[]です。
     * - 戻り値の配列の長さは必ずg個ですが、残存トークンが不足している場合は長さnに満たない配列や空配列が含まれることがあります。
     * @param n 取得するトークンの最大数
     * @param g トークンのグループ数(トークンいくつで1巡するか)
     */
    str(n: number, g: number): string[][];
    str(n?: number, g?: number): string | string[] | string[][] | undefined {
        const mapFn = (token: string) => token;
        if (n == null) return this.#read(mapFn);
        else if (g == null) return this.#read(mapFn, n);
        else return this.#read(mapFn, n, g);
    }

    /**
     * トークンを1つ、number(64bit浮動小数点数)として取得します。小数を許容します。
     * - もうトークンが存在しない場合、undefinedを返します。
     */
    num(): number | undefined;
    /**
     * トークンを(最大)n個、number[]として取得します。各要素は小数を許容します。
     * - 残りトークンがn個に満たない場合、長さn未満のnumber[]が返されます。
     * @param n 取得するトークンの最大数
     */
    num(n: number): number[];
    /**
     * トークンを(最大)n×g個、number[][]として取得します。各要素は小数を許容します。
     * - 戻り値のi(0≦i<g)番目の配列は、残存トークンのうちi番目, g+i番目, 2g+i番目, ..., (n-1)g+i番目のトークンを順に取得したnumber[]です。
     * - 戻り値の配列の長さは必ずg個ですが、残存トークンが不足している場合は長さnに満たない配列や空配列が含まれることがあります。
     * @param n 取得するトークンの最大数
     * @param g トークンのグループ数(トークンいくつで1巡するか)
     */
    num(n: number, g: number): number[][];
    num(n?: number, g?: number): number | number[] | number[][] | undefined {
        const mapFn = (token: string) => Number.parseFloat(token);
        if (n == null) return this.#read(mapFn);
        else if (g == null) return this.#read(mapFn, n);
        else return this.#read(mapFn, n, g);
    }

    /**
     * トークンを1つ、整数値のnumberとして取得します。
     * - もうトークンが存在しない場合、undefinedを返します。
     */
    int(): number | undefined;
    /**
     * トークンを(最大)n個、number[]として取得します。
     * - 残りトークンがn個に満たない場合、長さn未満の整数値の配列(number[])が返されます。
     * @param n 取得するトークンの最大数
     */
    int(n: number): number[];
    /**
     * トークンを(最大)n×g個、整数値のnumber[][]として取得します。
     * - 戻り値のi(0≦i<g)番目の配列は、残存トークンのうちi番目, g+i番目, 2g+i番目, ..., (n-1)g+i番目のトークンを順に整数値として取得したnumber[]です。
     * - 戻り値の配列の長さは必ずg個ですが、残存トークンが不足している場合は長さnに満たない配列や空配列が含まれることがあります。
     * @param n 取得するトークンの最大数
     * @param g トークンのグループ数(トークンいくつで1巡するか)
     */
    int(n: number, g: number): number[][];
    int(n?: number, g?: number): number | number[] | number[][] | undefined {
        const mapFn = (token: string) => Number.parseInt(token);
        if (n == null) return this.#read(mapFn);
        else if (g == null) return this.#read(mapFn, n);
        else return this.#read(mapFn, n, g);
    }

    /**
     * トークンを1つ、BigIntとして取得します。
     * - もうトークンが存在しない場合、undefinedを返します。
     */
    bigint(): bigint | undefined;
    /**
     * トークンを(最大)n個、bigint[]として取得します。
     * - 残りトークンがn個に満たない場合、長さn未満のBigIntの配列(bigint[])が返されます。
     * @param n 取得するトークンの最大数
     */
    bigint(n: number): bigint[];
    /**
     * トークンを(最大)n×g個、bigint[][]として取得します。
     * - 戻り値のi(0≦i<g)番目の配列は、残存トークンのうちi番目, g+i番目, 2g+i番目, ..., (n-1)g+i番目のトークンを順に取得したbigint[]です。
     * - 戻り値の配列の長さは必ずg個ですが、残存トークンが不足している場合は長さnに満たない配列や空配列が含まれることがあります。
     * @param n 取得するトークンの最大数
     * @param g トークンのグループ数(トークンいくつで1巡するか)
     */
    bigint(n: number, g: number): bigint[][];
    bigint(n?: number, g?: number): bigint | bigint[] | bigint[][] | undefined {
        const mapFn = (token: string) => BigInt(token);
        if (n == null) return this.#read(mapFn);
        else if (g == null) return this.#read(mapFn, n);
        else return this.#read(mapFn, n, g);
    }
}
