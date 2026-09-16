// ================================================================================================
// WASI Clang: sysroot tar・ドライバダンプ・cc1 / wasm-ld の呼び出し
// ================================================================================================

import { CPP_COMPILE_FLAGS } from "./assets";

export type EmscriptenFS = {
    mkdirTree: (path: string) => void;
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string, opts?: { encoding: "binary" }) => Uint8Array;
    analyzePath: (path: string) => { exists: boolean };
};

export type ToolModule = {
    FS: EmscriptenFS;
    callMain: (args: string[]) => number;
};

export type CompileFailure = {
    ok: false;
    stage: "driver" | "cc1" | "lld";
    compileOutput: string;
};

export type CompileSuccess = {
    ok: true;
    compileOutput: string;
    wasm: Uint8Array;
};

export type CompileResult = CompileFailure | CompileSuccess;

export type DriverInvocation = {
    compilerArgs: string[];
    compilerArtifact: string;
    linkerArgs: string[];
    linkerArtifact: string;
};

type TarEntry = {
    name: string;
    content: Uint8Array;
};

const cString = (bytes: Uint8Array): string => {
    const end = bytes.indexOf(0);
    return new TextDecoder("utf-8").decode(end < 0 ? bytes : bytes.subarray(0, end));
};

export const tarContents = (contents: Uint8Array): TarEntry[] => {
    const entries: TarEntry[] = [];
    let offset = 0;
    while (offset + 512 <= contents.length) {
        const header = contents.subarray(offset, offset + 512);
        const name = cString(header.subarray(0, 100));
        if (!name) {
            break;
        }
        const size = Number.parseInt(cString(header.subarray(124, 136)).trim(), 8) || 0;
        const contentStart = offset + 512;
        entries.push({ name, content: contents.subarray(contentStart, contentStart + size) });
        offset += 512 + Math.ceil(size / 512) * 512;
    }
    return entries;
};

export const installTree = (module: ToolModule, files: Readonly<Record<string, string | Uint8Array>>): void => {
    for (const [name, content] of Object.entries(files)) {
        if (!name || name.endsWith("/")) {
            continue;
        }
        const dirName = name.split("/").slice(0, -1).join("/");
        if (dirName && !module.FS.analyzePath(dirName).exists) {
            module.FS.mkdirTree(dirName);
        }
        module.FS.writeFile(name, typeof content === "string" ? content : content);
    }
};

export const sysrootFiles = (tar: Uint8Array): Record<string, Uint8Array> => {
    const files: Record<string, Uint8Array> = {};
    for (const { name, content } of tarContents(tar)) {
        if (!name || name.endsWith("/")) {
            continue;
        }
        files[name] = content;
    }
    return files;
};

export const installSysroot = (module: ToolModule, tar: Uint8Array): void => {
    installTree(module, sysrootFiles(tar));
};

const quotedArgs = (line: string): string[] => [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]).slice(1);

const formatCallError = (error: unknown, stderr: string): string => {
    const message = error instanceof Error ? error.message : String(error);
    return [stderr, message].filter((part) => part.length > 0).join("\n");
};

const outputOf = (args: readonly string[]): string | undefined => {
    const index = args.indexOf("-o");
    return index >= 0 ? args[index + 1] : undefined;
};

export const parseDriverDump = (stderr: string): DriverInvocation => {
    const lines = stderr.split("\n");
    const cc1Line = lines.find((line) => line.includes("-cc1")) ?? "";
    const linkerLine = lines.find((line) => line.includes("wasm-ld")) ?? "";
    const compilerArgs = quotedArgs(cc1Line);
    const linkerArgs = quotedArgs(linkerLine);
    const compilerArtifact = outputOf(compilerArgs);
    const linkerArtifact = outputOf(linkerArgs);
    if (compilerArgs.length === 0 || !compilerArtifact) {
        throw new Error(`clang -### did not emit -cc1 args\n${stderr}`);
    }
    if (linkerArgs.length === 0 || !linkerArtifact) {
        throw new Error(`clang -### did not emit wasm-ld args\n${stderr}`);
    }
    return { compilerArgs, compilerArtifact, linkerArgs, linkerArtifact };
};

type Capture = {
    getStderr: () => string;
    resetStderr: () => void;
};

export const compileSource = (params: {
    clang: ToolModule;
    lld: ToolModule;
    capture: Capture;
    source: string;
    fileName?: string;
    extraFiles?: Readonly<Record<string, string | Uint8Array>>;
}): CompileResult => {
    const { clang, lld, capture, extraFiles } = params;
    const fileName = params.fileName ?? "Main.cpp";
    clang.FS.writeFile(fileName, params.source);
    if (extraFiles) {
        installTree(clang, extraFiles);
        installTree(lld, extraFiles);
    }

    capture.resetStderr();
    let dumpCode: number;
    try {
        dumpCode = clang.callMain([fileName, ...CPP_COMPILE_FLAGS, "-###"]);
    } catch (error) {
        return { ok: false, stage: "driver", compileOutput: formatCallError(error, capture.getStderr()) };
    }
    const dumpText = capture.getStderr();
    if (dumpCode !== 0) {
        return { ok: false, stage: "driver", compileOutput: dumpText };
    }

    let invocation: DriverInvocation;
    try {
        invocation = parseDriverDump(dumpText);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, stage: "driver", compileOutput: message };
    }

    capture.resetStderr();
    let compileCode: number;
    try {
        compileCode = clang.callMain(invocation.compilerArgs);
    } catch (error) {
        return { ok: false, stage: "cc1", compileOutput: formatCallError(error, capture.getStderr()) };
    }
    const compileOutput = capture.getStderr();
    if (compileCode !== 0) {
        return { ok: false, stage: "cc1", compileOutput };
    }
    const objectFile = clang.FS.readFile(invocation.compilerArtifact, { encoding: "binary" });

    lld.FS.writeFile(invocation.compilerArtifact, objectFile);
    capture.resetStderr();
    let linkCode: number;
    try {
        linkCode = lld.callMain(invocation.linkerArgs);
    } catch (error) {
        return {
            ok: false,
            stage: "lld",
            compileOutput: `${compileOutput}${formatCallError(error, capture.getStderr())}`,
        };
    }
    const linkOutput = capture.getStderr();
    if (linkCode !== 0) {
        return { ok: false, stage: "lld", compileOutput: `${compileOutput}${linkOutput}` };
    }
    const wasm = lld.FS.readFile(invocation.linkerArtifact, { encoding: "binary" });
    return { ok: true, compileOutput: `${compileOutput}${linkOutput}`, wasm };
};
