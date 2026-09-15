// ================================================================================================
// Language Module - Ruby (ruby.wasm / CRuby 3.4 WASI)
// ================================================================================================

import {
    ConsoleStdout,
    Directory,
    File,
    OpenFile,
    PreopenDirectory,
    WASI,
    WASIProcExit,
    type Inode,
} from "@bjorn3/browser_wasi_shim";
import { RubyVM } from "@ruby/wasm-wasi";
import type { LanguageModule } from "../../types";
import {
    RUBY_GEMS_JSON_FILE_NAME,
    RUBY_PUBLIC_ASSETS_BASE,
    RUBY_WASM_FILE_NAME,
    rubyCacheSubdir,
    type RubyGemsBundle,
} from "./gems";

type IoBuffers = {
    stdout: string;
    stderr: string;
};

export type LanguageContext = {
    vm: RubyVM;
    root: Directory;
    io: IoBuffers;
};

const textEncoder = new TextEncoder();

const formatErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};

const classifyRubyError = (error: unknown): "CE" | "RE" => {
    const message = formatErrorMessage(error);
    if (/\bSyntaxError\b/.test(message)) {
        return "CE";
    }
    return "RE";
};

/** MRI のプロセス終了。status 0 は正常終了（ジャッジも RE にしない） */
const isSuccessfulProcessExit = (error: unknown): boolean => error instanceof WASIProcExit && error.code === 0;

type DirTree = {
    files: Map<string, Uint8Array>;
    dirs: Map<string, DirTree>;
};

const emptyTree = (): DirTree => ({ files: new Map(), dirs: new Map() });

const addFileToTree = (tree: DirTree, relativePath: string, data: Uint8Array): void => {
    const parts = relativePath.split("/").filter((part) => part !== "" && part !== ".");
    if (parts.length === 0 || parts.includes("..")) {
        return;
    }
    let current = tree;
    for (const part of parts.slice(0, -1)) {
        let child = current.dirs.get(part);
        if (!child) {
            child = emptyTree();
            current.dirs.set(part, child);
        }
        current = child;
    }
    const fileName = parts[parts.length - 1];
    if (fileName) {
        current.files.set(fileName, data);
    }
};

const treeToDirectory = (tree: DirTree): Directory => {
    const contents = new Map<string, Inode>();
    for (const [name, data] of tree.files) {
        contents.set(name, new File(data));
    }
    for (const [name, child] of tree.dirs) {
        contents.set(name, treeToDirectory(child));
    }
    return new Directory(contents);
};

const gemsDirectoryFromBundle = (bundle: RubyGemsBundle): Directory => {
    const tree = emptyTree();
    for (const [relativePath, source] of Object.entries(bundle.files)) {
        addFileToTree(tree, relativePath, textEncoder.encode(source));
    }
    return treeToDirectory(tree);
};

const loadRubyAssets = async (): Promise<{ wasmBytes: Uint8Array; bundle: RubyGemsBundle }> => {
    if (import.meta.env.MODE === "test") {
        const { readFile } = await import("node:fs/promises");
        const { resolve } = await import("node:path");
        const cacheDir = resolve(".wxt", rubyCacheSubdir());
        const [wasmBytes, gemsJson] = await Promise.all([
            readFile(resolve(cacheDir, RUBY_WASM_FILE_NAME)),
            readFile(resolve(cacheDir, RUBY_GEMS_JSON_FILE_NAME), "utf8"),
        ]);
        return {
            wasmBytes: new Uint8Array(wasmBytes),
            bundle: JSON.parse(gemsJson) as RubyGemsBundle,
        };
    }

    if (typeof self === "undefined" || !self.location) {
        throw new Error("AIBP: Cannot resolve Ruby assets");
    }
    const { protocol, origin } = self.location;
    if (protocol !== "chrome-extension:" && protocol !== "moz-extension:") {
        throw new Error("AIBP: Cannot resolve Ruby assets");
    }
    const base = new URL(`/${RUBY_PUBLIC_ASSETS_BASE}/`, `${origin}/`);
    const [wasmResponse, gemsResponse] = await Promise.all([
        fetch(new URL(RUBY_WASM_FILE_NAME, base)),
        fetch(new URL(RUBY_GEMS_JSON_FILE_NAME, base)),
    ]);
    if (!wasmResponse.ok) {
        throw new Error(`AIBP: Failed to fetch Ruby wasm (${wasmResponse.status})`);
    }
    if (!gemsResponse.ok) {
        throw new Error(`AIBP: Failed to fetch Ruby gems.json (${gemsResponse.status})`);
    }
    return {
        wasmBytes: new Uint8Array(await wasmResponse.arrayBuffer()),
        bundle: (await gemsResponse.json()) as RubyGemsBundle,
    };
};

const putRootFile = (root: Directory, name: string, data: Uint8Array): void => {
    root.contents.set(name, new File(data));
};

const STDIN_PREAMBLE = `\
stdin = File.open("/aibp-stdin", "r")
$stdin = stdin
begin
  Object.send(:remove_const, :STDIN)
rescue NameError
end
Object.const_set(:STDIN, stdin)
`;

/** `exit` / `exit 0` は SystemExit(success) なので、eval の外へ漏らさない（MRI のプロセス終了に合わせる） */
const LOAD_USER_CODE = `\
begin
  load "/Main.rb"
rescue SystemExit => e
  raise unless e.success?
end
`;

export const ruby: LanguageModule<LanguageContext> = {
    async init() {
        const { wasmBytes, bundle } = await loadRubyAssets();
        const wasmBuffer = new ArrayBuffer(wasmBytes.byteLength);
        new Uint8Array(wasmBuffer).set(wasmBytes);
        const rubyModule = await WebAssembly.compile(wasmBuffer);

        const gemsDir = gemsDirectoryFromBundle(bundle);
        const rootMap = new Map<string, Inode>([["gems", gemsDir]]);
        const preopen = new PreopenDirectory("/", rootMap);

        const io: IoBuffers = { stdout: "", stderr: "" };
        const stdoutDecoder = new TextDecoder("utf-8", { fatal: false });
        const stderrDecoder = new TextDecoder("utf-8", { fatal: false });
        const wasi = new WASI(
            [],
            [],
            [
                new OpenFile(new File([])),
                new ConsoleStdout((chunk) => {
                    io.stdout += stdoutDecoder.decode(chunk, { stream: true });
                }),
                new ConsoleStdout((chunk) => {
                    io.stderr += stderrDecoder.decode(chunk, { stream: true });
                }),
                preopen,
            ],
            { debug: false },
        );

        const { vm } = await RubyVM.instantiateModule({ module: rubyModule, wasip1: wasi });
        if (!bundle.loadPaths || bundle.loadPaths.length === 0) {
            throw new Error("AIBP: Ruby gems.json missing loadPaths");
        }
        const loadPathArgs = bundle.loadPaths.map((relative) => JSON.stringify(`/gems/${relative}`)).join(", ");
        vm.eval(`$LOAD_PATH.unshift(${loadPathArgs})`);

        return { vm, root: preopen.dir, io };
    },

    async run(ctx, code, stdin) {
        const { vm, root, io } = ctx;
        io.stdout = "";
        io.stderr = "";

        putRootFile(root, "aibp-stdin", textEncoder.encode(stdin));
        putRootFile(root, "Main.rb", textEncoder.encode(code));

        try {
            vm.eval(STDIN_PREAMBLE);
            vm.eval(LOAD_USER_CODE);
            return {
                status: "completed",
                stdout: io.stdout,
                stderr: io.stderr,
            };
        } catch (error) {
            if (isSuccessfulProcessExit(error)) {
                return {
                    status: "completed",
                    stdout: io.stdout,
                    stderr: io.stderr,
                };
            }
            const capturedStderr = io.stderr;
            const thrown = formatErrorMessage(error);
            return {
                status: classifyRubyError(error),
                stdout: io.stdout,
                stderr: capturedStderr.includes(thrown) ? capturedStderr : `${capturedStderr}${thrown}`,
            };
        }
    },
};
