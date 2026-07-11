/**
 * QuickJS VMのグローバルに差し込む、console.log, errorの自前実装です。
 * 呼び出し元はグローバルの__stdout__, __stderr__にstring[]で保存されることを期待しているので、それに合うよう実装します。
 * このコードは、QuickJS VMに直接流し込まれることに注意してください。
 */

/**
 * console.log, errorの引数を、出力として適切なstringに変換します。
 * @param {*} value
 * @returns {string}
 */
function __aibpFormatConsoleArg(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    const t = typeof value;
    if (t === "string") return value;
    if (t === "number") {
        if (Object.is(value, -0)) return "-0";
        return String(value);
    }
    if (t === "boolean") return String(value);
    if (t === "bigint") return String(value) + "n";
    return ObjectInspect(value);
}

/**
 * console.log, errorの自前実装と、グローバルの__stdout__, __stderr__の初期化を行います。
 */
globalThis.__aibpSetupConsole = function () {
    globalThis.__stdout__ = [];
    globalThis.__stderr__ = [];
    globalThis.console = {
        log: (...args) => globalThis.__stdout__.push(args.map(__aibpFormatConsoleArg).join(" ")),
        error: (...args) => globalThis.__stderr__.push(args.map(__aibpFormatConsoleArg).join(" ")),
    };
};
