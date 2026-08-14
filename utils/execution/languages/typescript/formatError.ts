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

const STACK_POS_RE = /([^:\s()]+):(\d+):(\d+)/;

const tryCreateMapper = (mapJson: string | undefined): TraceMap | undefined => {
    if (!mapJson) {
        return undefined;
    }
    try {
        return new TraceMap(mapJson);
    } catch {
        return undefined;
    }
};

/**
 * QuickJS の stack にある file:line:col を、esbuild sourcemap でユーザーソース座標へ戻します。
 * QuickJS の列は 1-based、source map の列は 0-based。マップできないフレームはそのまま残します。
 */
export const remapStack = (stack: string, mapJson: string | undefined): string => {
    const mapper = tryCreateMapper(mapJson);
    if (!mapper) {
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

/**
 * Bun 寄りの 1 行 snippet。プレフィックスは `{line} | {source}`。
 * 行が無ければ undefined。列が行末より右（EOF 含む）なら caret なし。
 */
export const formatSnippet = (source: string, line: number, column1based: number): string | undefined => {
    if (!Number.isInteger(line) || line < 1) {
        return undefined;
    }
    const lines = source.split(/\r?\n/);
    if (line > lines.length) {
        return undefined;
    }
    const sourceLine = lines[line - 1];
    const prefix = `${line} | `;
    const snippetLine = `${prefix}${sourceLine}`;
    if (!Number.isInteger(column1based) || column1based < 1 || column1based > sourceLine.length) {
        return snippetLine;
    }
    return `${snippetLine}\n${" ".repeat(prefix.length + column1based - 1)}^`;
};

const snippetFromGeneratedStack = (
    stack: string,
    mapJson: string | undefined,
    sourceCode: string | undefined,
): string | undefined => {
    if (!sourceCode) {
        return undefined;
    }
    const mapper = tryCreateMapper(mapJson);
    if (!mapper) {
        return undefined;
    }
    const pos = stack.match(STACK_POS_RE);
    if (!pos) {
        return undefined;
    }
    const orig = originalPositionFor(mapper, {
        line: Number(pos[2]),
        column: Number(pos[3]) - 1,
    });
    if (orig.line == null || orig.column == null) {
        return undefined;
    }
    return formatSnippet(sourceCode, orig.line, orig.column + 1);
};

const prependSnippet = (body: string, snippet: string | undefined): string => {
    if (!snippet) {
        return body;
    }
    return `${snippet}\n${body}`;
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
 * QuickJS dump 結果を JSON ではなく、snippet + Name: message + stack の文字列にします。
 */
export const formatRuntimeError = (dumped: unknown, mapJson: string | undefined, sourceCode?: string): string => {
    if (typeof dumped === "string") {
        const remapped = remapStack(dumped, mapJson);
        return prependSnippet(remapped, snippetFromGeneratedStack(dumped, mapJson, sourceCode));
    }
    if (dumped === null || typeof dumped !== "object") {
        return String(dumped);
    }
    const record = dumped as RuntimeErrorDump;
    const header = formatRuntimeHeader(record);
    const rawStack = typeof record.stack === "string" ? record.stack : "";
    const stack = rawStack ? remapStack(rawStack, mapJson).replace(/\n$/u, "") : "";
    const snippet = rawStack ? snippetFromGeneratedStack(rawStack, mapJson, sourceCode) : undefined;
    const body = header && stack ? `${header}\n${stack}` : header || stack || String(dumped);
    return prependSnippet(body, snippet);
};

const formatEsbuildMessage = (msg: EsbuildMessage, sourceCode: string | undefined): string => {
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
    const column1based = column + 1;
    const file = typeof loc.file === "string" && loc.file.length > 0 ? loc.file : "Main.js";
    const body = `${text}\n    at ${file}:${line}:${column1based}`;
    if (!sourceCode) {
        return body;
    }
    return prependSnippet(body, formatSnippet(sourceCode, line, column1based));
};

const isEsbuildFailure = (error: unknown): error is { errors: unknown } =>
    error !== null && typeof error === "object" && "errors" in error;

/**
 * esbuild の変換失敗を、RE と同じく snippet + メッセージ + at file:line:col へ揃えます。
 * location が無い普通の Error は message のままです。列は 1-based（esbuild の 0-based + 1）。
 */
export const formatTransformError = (error: unknown, sourceCode?: string): string => {
    if (isEsbuildFailure(error) && Array.isArray(error.errors) && error.errors.length > 0) {
        return error.errors.map((item) => formatEsbuildMessage(item as EsbuildMessage, sourceCode)).join("\n");
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};
