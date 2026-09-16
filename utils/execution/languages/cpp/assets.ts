// ================================================================================================
// C++: xeus-cpp / Clang 21.1.8 ランタイムのピン
// ================================================================================================

export const CPP_CACHE_DIR_NAME = "aibp-cpp-cache";

export const CPP_PUBLIC_ASSETS_BASE = "assets/cpp";

export const CPP_STAMP = "xeus-cpp-0.10.0-clang-21.1.8";

export const cppCacheSubdir = (): string => `${CPP_CACHE_DIR_NAME}/${CPP_STAMP}`;

export const CPP_CHANNEL_BASE = "https://prefix.dev/emscripten-forge-4x/emscripten-wasm32";

export const ACL_VERSION = "1.6";

export const ACL_TARBALL_URL = `https://github.com/atcoder/ac-library/archive/refs/tags/v${ACL_VERSION}.tar.gz`;

export type CondaPackageSpec = {
    fileName: string;
    sha256: string;
};

/** emscripten-forge-4x / emscripten-wasm32。sha256 は prefix.dev の repodata */
export const CPP_CONDA_PACKAGES: readonly CondaPackageSpec[] = [
    {
        fileName: "xeus-cpp-0.10.0-h0b0027f_0.tar.bz2",
        sha256: "de269a95d4e5cca9840615db5c231823017f237435d32f523b943118c205c046",
    },
    {
        fileName: "cppinterop-1.9.0-h0b0027f_0.tar.bz2",
        sha256: "ee1433b4e7e218391a59b79a4b0a9355fb38b42daef7f3df78974cf5b56d7823",
    },
    {
        fileName: "xeus-6.0.3-h0b0027f_0.tar.bz2",
        sha256: "54dbcd76281f08634c645f72d49bce40e409081318df7e7cb271a204b2d9cbcb",
    },
    {
        fileName: "xeus-lite-5.0.0-h0b0027f_0.tar.bz2",
        sha256: "6fe5b17c8293ec324f3000757a2538f60b737eca1c9362ebda9999b72a19e6b4",
    },
];

export const CPP_RUNTIME_FILES = ["xcpp.js", "xcpp.wasm", "xcpp.data", "libclangCppInterOp.so", "libxeus.so"] as const;

export const CPP_INCLUDE_BUNDLE_FILE_NAME = "include.json";

/** AMO の非バイナリ 5MB/file。clang resource headers は xcpp.data 側にあり、ここには載せない */
export const CPP_INCLUDE_BUNDLE_MAX_BYTES = 5 * 1024 * 1024;

export type CppIncludeBundle = {
    files: Record<string, string>;
};
