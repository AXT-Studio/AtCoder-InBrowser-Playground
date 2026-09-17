// ================================================================================================
// C++: WASI Clang 21.1.0（自前 Emscripten wasm）ランタイムのピン
// ================================================================================================

export const CPP_CACHE_DIR_NAME = "aibp-cpp-cache";

export const CPP_PUBLIC_ASSETS_BASE = "assets/cpp";

/** ジャッジと同じ Clang 21.1.0 + wasi-sdk 28。再ビルドは `pnpm run build:engine:clang` */
export const CPP_STAMP = "clang-21.1.0-wasi-sdk-28";

/** プロジェクトルートからの相対 */
export const CPP_LOCAL_DIST_REL = "engine/clang-wasi/dist";

/** GCC libstdc++ pb_ds。`pnpm run build:engine:clang` が dist/gnu-compat へ取得 */
export const CPP_GNU_COMPAT_DIST_REL = `${CPP_LOCAL_DIST_REL}/gnu-compat`;

export const cppCacheSubdir = (): string => `${CPP_CACHE_DIR_NAME}/${CPP_STAMP}`;

export const ACL_VERSION = "1.6";

export const ACL_TARBALL_URL = `https://github.com/atcoder/ac-library/archive/refs/tags/v${ACL_VERSION}.tar.gz`;

export const CPP_TOOL_FILES = ["clang.js", "clang.wasm", "lld.js", "lld.wasm", "sysroot.tar"] as const;

export const CPP_INCLUDE_BUNDLE_FILE_NAME = "include.json";

/** AMO の非バイナリ 5MB/file */
export const CPP_INCLUDE_BUNDLE_MAX_BYTES = 5 * 1024 * 1024;

export const CPP_RESOURCE_DIR = "/lib/clang/21";

export const CPP_COMPILE_FLAGS = [
    "--target=wasm32-wasip1",
    "--sysroot=/",
    `-resource-dir=${CPP_RESOURCE_DIR}`,
    "-std=gnu++23",
    "-stdlib=libc++",
    "-O2",
    "-DATCODER",
    "-DONLINE_JUDGE",
    "-fno-exceptions",
    "-fno-rtti",
    "-fexperimental-library",
] as const;

export type CppIncludeBundle = {
    files: Record<string, string>;
};
