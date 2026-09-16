// ================================================================================================
// Language Module - C++ (WASI Clang 21.1.0)
// ================================================================================================

import { ConsoleStdout, File, OpenFile, WASI, WASIProcExit } from "@bjorn3/browser_wasi_shim";
import type { LanguageModule } from "../../types";
import { CPP_INCLUDE_BUNDLE_FILE_NAME, CPP_PUBLIC_ASSETS_BASE, cppCacheSubdir, type CppIncludeBundle } from "./assets";
import { compileSource, installTree, sysrootFiles, type CompileResult, type ToolModule } from "./compile";

type IoBuffers = {
    stdout: string;
    stderr: string;
};

type ToolFactory = (options: Record<string, unknown>) => Promise<ToolModule>;

type Capture = {
    getStderr: () => string;
    resetStderr: () => void;
    append: (text: string) => void;
};

export type LanguageContext = {
    clangFactory: ToolFactory;
    lldFactory: ToolFactory;
    clangWasm: Uint8Array;
    lldWasm: Uint8Array;
    sysrootTar: Uint8Array;
    extraFiles: Record<string, string>;
    capture: Capture;
    userWasm: Uint8Array | null;
    io: IoBuffers;
};

const textEncoder = new TextEncoder();

const formatErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};

const loadBytes = async (pathOrUrl: string): Promise<Uint8Array> => {
    if (import.meta.env.MODE === "test") {
        const { readFile } = await import("node:fs/promises");
        return new Uint8Array(await readFile(pathOrUrl));
    }
    const response = await fetch(pathOrUrl);
    if (!response.ok) {
        throw new Error(`AIBP: Failed to fetch C++ asset (${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
};

const resolveAssetBase = async (): Promise<{ kind: "test" | "extension"; base: string }> => {
    if (import.meta.env.MODE === "test") {
        const { resolve } = await import("node:path");
        return { kind: "test", base: resolve(".wxt", cppCacheSubdir(), "runtime") };
    }
    if (typeof self === "undefined" || !self.location) {
        throw new Error("AIBP: Cannot resolve C++ assets");
    }
    const { protocol, origin } = self.location;
    if (protocol !== "chrome-extension:" && protocol !== "moz-extension:") {
        throw new Error("AIBP: Cannot resolve C++ assets");
    }
    return { kind: "extension", base: new URL(`/${CPP_PUBLIC_ASSETS_BASE}/`, `${origin}/`).toString() };
};

const assetUrl = (base: { kind: "test" | "extension"; base: string }, fileName: string): string => {
    if (base.kind === "test") {
        return `${base.base}/${fileName}`;
    }
    return new URL(fileName, base.base).toString();
};

const unwrapFactory = (exported: unknown): ToolFactory => {
    if (typeof exported === "function") {
        return exported as ToolFactory;
    }
    if (typeof exported === "object" && exported !== null && "default" in exported) {
        const factory = (exported as { default: unknown }).default;
        if (typeof factory === "function") {
            return factory as ToolFactory;
        }
    }
    throw new Error("AIBP: C++ tool factory is not a function");
};

const loadToolFactory = async (jsPath: string): Promise<ToolFactory> => {
    if (import.meta.env.MODE === "test") {
        const { pathToFileURL } = await import("node:url");
        return unwrapFactory(await import(/* @vite-ignore */ pathToFileURL(jsPath).href));
    }
    return unwrapFactory(await import(/* @vite-ignore */ jsPath));
};

const createTool = async (params: {
    factory: ToolFactory;
    wasmBytes: Uint8Array;
    thisProgram: string;
    capture: { append: (text: string) => void };
}): Promise<ToolModule> => {
    const wasmBinary = new ArrayBuffer(params.wasmBytes.byteLength);
    new Uint8Array(wasmBinary).set(params.wasmBytes);
    return params.factory({
        wasmBinary,
        thisProgram: params.thisProgram,
        noExitRuntime: true,
        print: () => {},
        printErr: (data: string) => {
            params.capture.append(`${data}\n`);
        },
    });
};

const instantiateUserWasm = async (wasm: Uint8Array, stdin: string, io: IoBuffers): Promise<number> => {
    const stdoutDecoder = new TextDecoder("utf-8", { fatal: false });
    const stderrDecoder = new TextDecoder("utf-8", { fatal: false });
    const wasi = new WASI(
        ["a.out"],
        [],
        [
            new OpenFile(new File(textEncoder.encode(stdin))),
            new ConsoleStdout((chunk) => {
                io.stdout += stdoutDecoder.decode(chunk, { stream: true });
            }),
            new ConsoleStdout((chunk) => {
                io.stderr += stderrDecoder.decode(chunk, { stream: true });
            }),
        ],
        { debug: false },
    );
    const copy = new ArrayBuffer(wasm.byteLength);
    new Uint8Array(copy).set(wasm);
    const compiled = await WebAssembly.compile(copy);
    const instance = await WebAssembly.instantiate(compiled, {
        wasi_snapshot_preview1: wasi.wasiImport,
    });
    const memory = instance.exports.memory;
    const start = instance.exports._start;
    if (!(memory instanceof WebAssembly.Memory) || typeof start !== "function") {
        throw new Error("AIBP: C++ wasm is missing WASI exports");
    }
    try {
        return wasi.start({ exports: { memory, _start: () => start() } }) ?? 0;
    } catch (error) {
        if (error instanceof WASIProcExit) {
            return error.code;
        }
        throw error;
    } finally {
        io.stdout += stdoutDecoder.decode();
        io.stderr += stderrDecoder.decode();
    }
};

export const cpp: LanguageModule<LanguageContext> = {
    async init() {
        const io: IoBuffers = { stdout: "", stderr: "" };
        let captured = "";
        const capture = {
            getStderr: () => captured,
            resetStderr: () => {
                captured = "";
            },
            append: (text: string) => {
                captured += text;
            },
        };

        const assets = await resolveAssetBase();
        const [clangJs, lldJs, clangWasm, lldWasm, sysrootTar, includeJson] = await Promise.all([
            loadToolFactory(assetUrl(assets, "clang.js")),
            loadToolFactory(assetUrl(assets, "lld.js")),
            loadBytes(assetUrl(assets, "clang.wasm")),
            loadBytes(assetUrl(assets, "lld.wasm")),
            loadBytes(assetUrl(assets, "sysroot.tar")),
            loadBytes(assetUrl(assets, CPP_INCLUDE_BUNDLE_FILE_NAME)),
        ]);
        const bundle = JSON.parse(new TextDecoder().decode(includeJson)) as CppIncludeBundle;
        return {
            clangFactory: clangJs,
            lldFactory: lldJs,
            clangWasm,
            lldWasm,
            sysrootTar,
            extraFiles: bundle.files,
            capture,
            userWasm: null,
            io,
        };
    },

    async prepare(ctx, code) {
        ctx.userWasm = null;
        ctx.io.stdout = "";
        ctx.io.stderr = "";
        // Emscripten EXIT_RUNTIME なので、clang/lld はコンパイルごとに作り直す
        const [clang, lld] = await Promise.all([
            createTool({
                factory: ctx.clangFactory,
                wasmBytes: ctx.clangWasm,
                thisProgram: "clang++",
                capture: ctx.capture,
            }),
            createTool({
                factory: ctx.lldFactory,
                wasmBytes: ctx.lldWasm,
                thisProgram: "wasm-ld",
                capture: ctx.capture,
            }),
        ]);
        const sysroot = sysrootFiles(ctx.sysrootTar);
        installTree(clang, sysroot);
        installTree(lld, sysroot);
        installTree(clang, ctx.extraFiles);
        let compiled: CompileResult;
        try {
            compiled = compileSource({ clang, lld, capture: ctx.capture, source: code });
        } catch (error) {
            return { status: "CE", stdout: "", stderr: formatErrorMessage(error) };
        }
        if (!compiled.ok) {
            return { status: "CE", stdout: "", stderr: compiled.compileOutput };
        }
        ctx.userWasm = compiled.wasm;
        return undefined;
    },

    async run(ctx, _code, stdin) {
        if (!ctx.userWasm) {
            return { status: "CE", stdout: "", stderr: "C++ program was not compiled" };
        }

        ctx.io.stdout = "";
        ctx.io.stderr = "";
        try {
            const exitCode = await instantiateUserWasm(ctx.userWasm, stdin, ctx.io);
            if (exitCode !== 0) {
                const detail = ctx.io.stderr || `exit ${exitCode}`;
                return { status: "RE", stdout: ctx.io.stdout, stderr: detail };
            }
            return { status: "completed", stdout: ctx.io.stdout, stderr: ctx.io.stderr };
        } catch (error) {
            return {
                status: "RE",
                stdout: ctx.io.stdout,
                stderr: `${ctx.io.stderr}${formatErrorMessage(error)}`,
            };
        }
    },
};
