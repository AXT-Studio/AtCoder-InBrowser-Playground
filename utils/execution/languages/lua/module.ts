// ================================================================================================
// Language Module - Lua (wasmoon / Lua 5.4.5 wasm)
// ================================================================================================

import { LuaFactory, type LuaEngine } from "wasmoon";
import glueWasmURL from "wasmoon/dist/glue.wasm?url&no-inline";
import type { LanguageModule } from "../../types";

/** ユーザーコードとは別チャンク。エラー行番号をずらさない */
const IO_SETUP = `\
local write_stdout = __aibp_write_stdout
local write_stderr = __aibp_write_stderr
__aibp_write_stdout = nil
__aibp_write_stderr = nil

local function concat_args(...)
    local n = select("#", ...)
    local parts = {}
    for i = 1, n do
        parts[i] = tostring(select(i, ...))
    end
    return table.concat(parts)
end

function print(...)
    local n = select("#", ...)
    local parts = {}
    for i = 1, n do
        parts[i] = tostring(select(i, ...))
    end
    write_stdout(table.concat(parts, "\\t") .. "\\n")
end

function io.write(...)
    write_stdout(concat_args(...))
    return true
end

local stdout_file = {}
function stdout_file:write(...)
    write_stdout(concat_args(...))
    return self
end
function stdout_file:flush()
    return true
end
function stdout_file:setvbuf()
    return true
end
function stdout_file:close()
    return true
end
io.stdout = stdout_file

local stderr_file = {}
function stderr_file:write(...)
    write_stderr(concat_args(...))
    return self
end
function stderr_file:flush()
    return true
end
function stderr_file:setvbuf()
    return true
end
function stderr_file:close()
    return true
end
io.stderr = stderr_file

io.input("/aibp-stdin")
`;

const resolveGlueWasmURI = async (): Promise<string> => {
    // Vitest は `?url` を相対パスにするので、パッケージ内 wasm を絶対パスで渡す。
    // `MODE === "test"` は production / dev ビルドで死コードになり、node:module は Worker に入らない。
    if (import.meta.env.MODE === "test") {
        const { createRequire } = await import("node:module");
        return createRequire(import.meta.url).resolve("wasmoon/dist/glue.wasm");
    }
    return glueWasmURL;
};

const formatErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};

export type LanguageContext = {
    factory: LuaFactory;
};

const attachIo = (
    lua: LuaEngine,
    stdin: string,
): {
    snapshot: () => { stdout: string; stderr: string };
} => {
    let stdout = "";
    let stderr = "";
    lua.global.set("__aibp_write_stdout", (chunk: string) => {
        stdout += String(chunk);
    });
    lua.global.set("__aibp_write_stderr", (chunk: string) => {
        stderr += String(chunk);
    });
    lua.global.lua.module.FS.writeFile("/aibp-stdin", stdin);
    lua.doStringSync(IO_SETUP);
    return {
        snapshot: () => ({ stdout, stderr }),
    };
};

export const lua: LanguageModule<LanguageContext> = {
    async init() {
        const factory = new LuaFactory(await resolveGlueWasmURI());
        await factory.getLuaModule();
        return { factory };
    },

    async run(ctx, code, stdin) {
        const engine = await ctx.factory.createEngine({
            injectObjects: false,
            enableProxy: true,
        });
        try {
            const io = attachIo(engine, stdin);
            try {
                engine.global.loadString(code, "@Main.lua");
            } catch (error) {
                const captured = io.snapshot();
                return {
                    status: "CE",
                    stdout: captured.stdout,
                    stderr: formatErrorMessage(error),
                };
            }
            try {
                engine.global.runSync();
                const captured = io.snapshot();
                return {
                    status: "completed",
                    stdout: captured.stdout,
                    stderr: captured.stderr,
                };
            } catch (error) {
                const captured = io.snapshot();
                return {
                    status: "RE",
                    stdout: captured.stdout,
                    stderr: formatErrorMessage(error),
                };
            }
        } finally {
            engine.global.close();
        }
    },
};
