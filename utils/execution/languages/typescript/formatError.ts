// ================================================================================================
// TS/JS 実行エラーの整形（QuickJS dump / esbuild 失敗 → 人が読める stderr）
// ================================================================================================

import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";

/** QuickJS dump が返す実行時エラー */
export type RuntimeErrorDump = {
    name?: unknown;
    message?: unknown;
    stack?: unknown;
};

type EsbuildLocation = {
    file?: unknown;
    line?: unknown;
    column?: unknown;
};

type EsbuildMessage = {
    text?: unknown;
    location?: EsbuildLocation | null;
};

/**
 * QuickJS の stack にある file:line:col を、esbuild sourcemap でユーザーソース座標へ戻します。
 * QuickJS の列は 1-based、source map の列は 0-based。マップできないフレームはそのまま残します。
 */
export const remapStack = (stack: string, mapJson: string | undefined): string => {
    if (!mapJson) {
        return stack;
    }
    let mapper: TraceMap;
    try {
        mapper = new TraceMap(mapJson);
    } catch {
        return stack;
    }
    return stack.replace(
        /(^|[\s(])([^:\s()]+):(\d+):(\d+)/gm,
        (matched, prefix: string, file: string, lineStr: string, colStr: string) => {
            const orig = originalPositionFor(mapper, {
                line: Number(lineStr),
                column: Number(colStr) - 1,
            });
            if (orig.line == null || orig.column == null) {
                return matched;
            }
            return `${prefix}${file}:${orig.line}:${orig.column + 1}`;
        },
    );
};

const formatRuntimeHeader = (dumped: RuntimeErrorDump): string => {
    const name = dumped.name == null ? "" : String(dumped.name);
    const message = dumped.message == null ? "" : String(dumped.message);
    if (name && message) {
        return `${name}: ${message}`;
    }
    return name || message;
};

/**
 * QuickJS dump 結果を JSON ではなく、Name: message + stack の文字列にします。
 */
export const formatRuntimeError = (dumped: unknown, mapJson: string | undefined): string => {
    if (typeof dumped === "string") {
        return remapStack(dumped, mapJson);
    }
    if (dumped === null || typeof dumped !== "object") {
        return String(dumped);
    }
    const record = dumped as RuntimeErrorDump;
    const header = formatRuntimeHeader(record);
    const stack = typeof record.stack === "string" ? remapStack(record.stack, mapJson).replace(/\n$/u, "") : "";
    if (header && stack) {
        return `${header}\n${stack}`;
    }
    if (header) {
        return header;
    }
    if (stack) {
        return stack;
    }
    return String(dumped);
};

const formatEsbuildMessage = (msg: EsbuildMessage): string => {
    const text = typeof msg.text === "string" && msg.text.length > 0 ? msg.text : "Transform failed";
    const loc = msg.location;
    if (loc == null || typeof loc !== "object") {
        return text;
    }
    const line = loc.line;
    const column = loc.column;
    if (typeof line !== "number" || typeof column !== "number") {
        return text;
    }
    const file = typeof loc.file === "string" && loc.file.length > 0 ? loc.file : "Main.js";
    return `${text}\n    at ${file}:${line}:${column}`;
};

const isEsbuildFailure = (error: unknown): error is { errors: unknown } =>
    error !== null && typeof error === "object" && "errors" in error;

/**
 * esbuild の変換失敗を、RE と同じく「メッセージ + at file:line:col」へ揃えます。
 * location が無い普通の Error は message のままです。
 */
export const formatTransformError = (error: unknown): string => {
    if (isEsbuildFailure(error) && Array.isArray(error.errors) && error.errors.length > 0) {
        return error.errors.map((item) => formatEsbuildMessage(item as EsbuildMessage)).join("\n");
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};
