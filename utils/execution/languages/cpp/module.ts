// ================================================================================================
// Language Module - C++ (xeus-cpp / Clang 21.1.8)
// ================================================================================================

import type { LanguageModule } from "../../types";
import { CPP_INCLUDE_BUNDLE_FILE_NAME, CPP_PUBLIC_ASSETS_BASE, cppCacheSubdir, type CppIncludeBundle } from "./assets";
import { AIBP_MAIN_NAME, wrapMain } from "./wrapMain";

type IoBuffers = {
    stdout: string;
    stderr: string;
};

type JupyterHeader = {
    msg_type?: string;
};

type JupyterMessage = {
    header?: JupyterHeader;
    content?: {
        name?: string;
        text?: string;
        status?: string;
        evalue?: string;
        traceback?: string[];
    };
};

type LoadedLib = {
    exports?: Record<string, unknown>;
};

type XeusModule = {
    FS: {
        mkdirTree: (path: string) => void;
        writeFile: (path: string, data: string | Uint8Array) => void;
    };
    LDSO?: {
        loadedLibsByName: Record<string, LoadedLib>;
    };
    xkernel: new (argv: string[]) => {
        get_server: () => { notify_listener: (message: unknown) => void };
        start: () => void;
    };
};

type CreateXeusModule = (options: Record<string, unknown>) => Promise<XeusModule>;

export type LanguageContext = {
    module: XeusModule;
    xserver: { notify_listener: (message: unknown) => void };
    io: IoBuffers;
    kernelMessages: JupyterMessage[];
    setStdin: (text: string) => void;
    compiledMain: ((...args: never[]) => number) | null;
};

const KERNEL_ARGV = [
    "xcpp",
    "-resource-dir",
    "/lib/clang/21",
    "-I",
    "/include/compat",
    "-I",
    "/include",
    "-std=gnu++23",
    "-DATCODER",
    "-DONLINE_JUDGE",
    "-fexperimental-library",
];

const textEncoder = new TextEncoder();

const formatErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};

const isJupyterMessage = (value: unknown): value is JupyterMessage =>
    typeof value === "object" && value !== null && "header" in value;

const jupyterExecute = (code: string, msgId: string): unknown => ({
    header: {
        msg_id: msgId,
        msg_type: "execute_request",
        username: "aibp",
        session: "aibp",
        version: "5.3",
        date: new Date().toISOString(),
    },
    parent_header: {},
    metadata: {},
    content: {
        code,
        silent: false,
        store_history: false,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: true,
    },
    buffers: [],
    channel: "shell",
});

const copyArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return copy;
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

const unwrapCreateXeusModule = (exported: unknown): CreateXeusModule => {
    if (typeof exported === "function") {
        return exported as CreateXeusModule;
    }
    if (typeof exported === "object" && exported !== null) {
        const record = exported as { default?: unknown; createXeusModule?: unknown };
        const factory = record.default ?? record.createXeusModule;
        if (typeof factory === "function") {
            return factory as CreateXeusModule;
        }
    }
    throw new Error("AIBP: createXeusModule is not a function");
};

const loadCreateXeusModule = async (jsPath: string): Promise<CreateXeusModule> => {
    if (import.meta.env.MODE === "test") {
        const { dirname } = await import("node:path");
        const { readFile } = await import("node:fs/promises");
        const { createRequire } = await import("node:module");
        const { runInThisContext } = await import("node:vm");
        const source = (await readFile(jsPath, "utf8")).replace(/^\s*export default createXeusModule;\s*$/m, "");
        const req = createRequire(jsPath);
        const module = { exports: {} as unknown };
        const compiled = runInThisContext(
            `(function (exports, require, module, __filename, __dirname) {\n${source}\n})`,
            { filename: jsPath },
        ) as (
            exports: unknown,
            require: NodeRequire,
            module: { exports: unknown },
            filename: string,
            dir: string,
        ) => void;
        compiled(module.exports, req, module, jsPath, dirname(jsPath));
        return unwrapCreateXeusModule(module.exports);
    }
    const imported = (await import(/* @vite-ignore */ jsPath)) as {
        default?: CreateXeusModule;
        createXeusModule?: CreateXeusModule;
    };
    return unwrapCreateXeusModule(imported);
};

const installIncludeTree = (module: XeusModule, bundle: CppIncludeBundle): void => {
    const dirs = new Set<string>();
    for (const relativePath of Object.keys(bundle.files)) {
        const parts = relativePath.split("/");
        let current = "";
        for (const part of parts.slice(0, -1)) {
            current = current ? `${current}/${part}` : `/${part}`;
            dirs.add(current);
        }
    }
    for (const dir of [...dirs].sort((a, b) => a.length - b.length)) {
        module.FS.mkdirTree(dir);
    }
    for (const [relativePath, source] of Object.entries(bundle.files)) {
        module.FS.writeFile(`/${relativePath}`, source);
    }
};

const collectKernelText = (messages: JupyterMessage[], name: "stdout" | "stderr"): string =>
    messages
        .filter((message) => message.header?.msg_type === "stream" && message.content?.name === name)
        .map((message) => message.content?.text ?? "")
        .join("");

const compileFailureMessage = (messages: JupyterMessage[], fallback: string): string => {
    const error = messages.find((message) => message.header?.msg_type === "error");
    const traceback = error?.content?.traceback?.join("\n") ?? "";
    const evalue = error?.content?.evalue ?? "";
    const stderr = collectKernelText(messages, "stderr");
    return [evalue, traceback, stderr, fallback].filter((part) => part.length > 0).join("\n");
};

const findMainExport = (
    module: XeusModule,
    entryName: string,
    symbol: string,
): ((...args: never[]) => number) | null => {
    const libs = module.LDSO?.loadedLibsByName ?? {};
    const names = Object.keys(libs);
    for (let index = names.length - 1; index >= 0; index -= 1) {
        const exports = libs[names[index]]?.exports;
        if (!exports) {
            continue;
        }
        const mangled = exports[symbol];
        if (typeof mangled === "function") {
            return mangled as (...args: never[]) => number;
        }
        const plain = exports[entryName];
        if (typeof plain === "function") {
            return plain as (...args: never[]) => number;
        }
        for (const [name, value] of Object.entries(exports)) {
            if (name.includes(entryName) && typeof value === "function") {
                return value as (...args: never[]) => number;
            }
        }
    }
    return null;
};

const isRunnerHostMessage = (message: unknown): boolean => {
    if (typeof message !== "object" || message === null || !("type" in message)) {
        return false;
    }
    const type = (message as { type?: unknown }).type;
    return type === "ready" || type === "result";
};

const attachPostMessageTap = (kernelMessages: JupyterMessage[]): void => {
    const target = globalThis as typeof globalThis & {
        postMessage?: (message: unknown, ...rest: unknown[]) => void;
        __aibpCppPostMessageWrapped?: boolean;
    };
    if (target.__aibpCppPostMessageWrapped) {
        return;
    }
    const native = target.postMessage?.bind(target);
    target.postMessage = (message: unknown, ...rest: unknown[]) => {
        if (isJupyterMessage(message) && message.header?.msg_type) {
            kernelMessages.push(message);
            return;
        }
        if (isRunnerHostMessage(message) && native) {
            native(message, ...rest);
        }
    };
    target.__aibpCppPostMessageWrapped = true;
};

let seq = 0;

export const cpp: LanguageModule<LanguageContext> = {
    async init() {
        const io: IoBuffers = { stdout: "", stderr: "" };
        const kernelMessages: JupyterMessage[] = [];
        let stdinBytes = new Uint8Array(0);
        let stdinOffset = 0;

        if (typeof (globalThis as { self?: unknown }).self === "undefined") {
            (globalThis as { self: typeof globalThis }).self = globalThis;
        }
        if (import.meta.env.MODE === "test") {
            const proc = process as NodeJS.Process & { type?: string };
            if (proc.type === "renderer") {
                proc.type = undefined;
            }
        }
        attachPostMessageTap(kernelMessages);

        const assets = await resolveAssetBase();
        const [wasmBytes, dataBytes, includeJson, createXeusModule] = await Promise.all([
            loadBytes(assetUrl(assets, "xcpp.wasm")),
            loadBytes(assetUrl(assets, "xcpp.data")),
            loadBytes(assetUrl(assets, CPP_INCLUDE_BUNDLE_FILE_NAME)),
            loadCreateXeusModule(assetUrl(assets, "xcpp.js")),
        ]);
        const bundle = JSON.parse(new TextDecoder().decode(includeJson)) as CppIncludeBundle;

        const module = await createXeusModule({
            wasmBinary: wasmBytes,
            dynamicLibraries: ["libxeus.so", "libclangCppInterOp.so"],
            getPreloadedPackage: () => copyArrayBuffer(dataBytes),
            locateFile: (file: string) => {
                const name = file.split("/").pop() ?? file;
                if (name.endsWith(".wasm")) {
                    return assetUrl(assets, "xcpp.wasm");
                }
                if (name.endsWith(".data")) {
                    return assetUrl(assets, "xcpp.data");
                }
                if (name.includes("libclangCppInterOp")) {
                    return assetUrl(assets, "libclangCppInterOp.so");
                }
                if (name.includes("libxeus")) {
                    return assetUrl(assets, "libxeus.so");
                }
                return assetUrl(assets, name);
            },
            print: (text: string) => {
                io.stdout += `${text}\n`;
            },
            printErr: (text: string) => {
                io.stderr += `${text}\n`;
            },
            stdin: () => {
                if (stdinOffset >= stdinBytes.length) {
                    return null;
                }
                const byte = stdinBytes[stdinOffset];
                stdinOffset += 1;
                return byte;
            },
        });

        installIncludeTree(module, bundle);
        const xkernel = new module.xkernel(KERNEL_ARGV);
        const xserver = xkernel.get_server();
        xkernel.start();

        return {
            module,
            xserver,
            io,
            kernelMessages,
            compiledMain: null,
            setStdin: (text: string) => {
                stdinBytes = textEncoder.encode(text);
                stdinOffset = 0;
            },
        };
    },

    async prepare(ctx, code) {
        seq += 1;
        const wrapped = wrapMain(code, `${AIBP_MAIN_NAME}_${seq}`);
        if (!wrapped.ok) {
            ctx.compiledMain = null;
            return { status: "CE", stdout: "", stderr: wrapped.reason };
        }

        ctx.compiledMain = null;
        ctx.kernelMessages.length = 0;
        ctx.io.stdout = "";
        ctx.io.stderr = "";
        try {
            ctx.xserver.notify_listener(jupyterExecute(wrapped.source, String(seq)));
        } catch (error) {
            return {
                status: "CE",
                stdout: collectKernelText(ctx.kernelMessages, "stdout"),
                stderr: compileFailureMessage(ctx.kernelMessages, formatErrorMessage(error)),
            };
        }

        const reply = ctx.kernelMessages.find((message) => message.header?.msg_type === "execute_reply");
        if (reply?.content?.status === "error") {
            return {
                status: "CE",
                stdout: collectKernelText(ctx.kernelMessages, "stdout"),
                stderr: compileFailureMessage(ctx.kernelMessages, ctx.io.stderr),
            };
        }

        const compiledMain = findMainExport(ctx.module, wrapped.entryName, wrapped.symbol);
        if (!compiledMain) {
            return {
                status: "CE",
                stdout: collectKernelText(ctx.kernelMessages, "stdout"),
                stderr: compileFailureMessage(ctx.kernelMessages, "compiled main export was not found"),
            };
        }
        ctx.compiledMain = compiledMain;
        return undefined;
    },

    async run(ctx, _code, stdin) {
        if (!ctx.compiledMain) {
            return { status: "CE", stdout: "", stderr: "C++ program was not compiled" };
        }

        ctx.kernelMessages.length = 0;
        ctx.io.stdout = "";
        ctx.io.stderr = "";
        ctx.setStdin(stdin);

        try {
            ctx.compiledMain();
            const stdout = collectKernelText(ctx.kernelMessages, "stdout") || ctx.io.stdout;
            const stderr = collectKernelText(ctx.kernelMessages, "stderr") || ctx.io.stderr;
            return { status: "completed", stdout, stderr };
        } catch (error) {
            const stdout = collectKernelText(ctx.kernelMessages, "stdout") || ctx.io.stdout;
            const stderr = compileFailureMessage(ctx.kernelMessages, formatErrorMessage(error));
            return { status: "RE", stdout, stderr };
        }
    },
};
