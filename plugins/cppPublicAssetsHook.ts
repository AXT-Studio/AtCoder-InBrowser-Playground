// ================================================================================================
// WXT: WASI Clang 21.1.0 + ACL + bits/stdc++.h + pb_ds を public assets に同梱する
// ================================================================================================

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { ResolvedPublicFile, Wxt } from "wxt";
import {
    ACL_TARBALL_URL,
    ACL_VERSION,
    CPP_GNU_COMPAT_DIST_REL,
    CPP_INCLUDE_BUNDLE_FILE_NAME,
    CPP_INCLUDE_BUNDLE_MAX_BYTES,
    CPP_LOCAL_DIST_REL,
    CPP_PUBLIC_ASSETS_BASE,
    CPP_TOOL_FILES,
    cppCacheSubdir,
    type CppIncludeBundle,
} from "../utils/execution/languages/cpp/assets";

const execFileAsync = promisify(execFile);

const NODE_ENV_NEEDLE =
    'var ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer"';
const NODE_ENV_REPLACEMENT = `${NODE_ENV_NEEDLE}&&!globalThis.WorkerGlobalScope`;

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
    error instanceof Error && "code" in error && typeof (error as NodeJS.ErrnoException).code === "string";

const sha256Hex = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const cppHeadersDir = (): string =>
    resolve(dirname(fileURLToPath(import.meta.url)), "../utils/execution/languages/cpp");

const stdcxxHeaderPath = (): string => resolve(cppHeadersDir(), "stdc++.h");

const extcxxHeaderPath = (): string => resolve(cppHeadersDir(), "extc++.h");

const cppShimsDirPath = (): string => resolve(cppHeadersDir(), "shims");

const downloadBytes = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`AIBP: Failed to download ${url} (HTTP ${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
};

const ensureCachedFile = async (params: {
    destPath: string;
    url: string;
    expectedSha256?: string;
}): Promise<string> => {
    const { destPath, url, expectedSha256 } = params;
    try {
        const cached = await readFile(destPath);
        if (!expectedSha256 || sha256Hex(cached) === expectedSha256.toLowerCase()) {
            return destPath;
        }
    } catch (error) {
        if (!isErrnoException(error) || error.code !== "ENOENT") {
            throw error;
        }
    }

    const bytes = await downloadBytes(url);
    if (expectedSha256 && sha256Hex(bytes) !== expectedSha256.toLowerCase()) {
        throw new Error(`AIBP: SHA256 mismatch for ${url}`);
    }
    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, bytes);
    return destPath;
};

const extractTar = async (archivePath: string, destDir: string): Promise<void> => {
    await mkdir(destDir, { recursive: true });
    await execFileAsync("tar", ["-xf", archivePath, "-C", destDir]);
};

const collectFiles = async (root: string): Promise<string[]> => {
    const out: string[] = [];
    const walk = async (dir: string): Promise<void> => {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(full);
            } else if (entry.isFile()) {
                out.push(full);
            }
        }
    };
    await walk(root);
    return out;
};

/**
 * Emscripten glue は process.versions.node があると Worker でも Node 分岐に入る。
 * 拡張 Worker では fs も `import("module")` も無いので、Worker では WEB 扱いにする。
 */
const patchToolJs = (source: string, fileName: string): string => {
    if (source.includes(NODE_ENV_REPLACEMENT)) {
        return source;
    }
    if (!source.includes(NODE_ENV_NEEDLE)) {
        throw new Error(`AIBP: ${fileName} ENVIRONMENT_IS_NODE needle was not found`);
    }
    return source.replace(NODE_ENV_NEEDLE, NODE_ENV_REPLACEMENT);
};

const addTreeToBundle = async (
    bundle: CppIncludeBundle,
    root: string,
    destPrefix: string,
    options?: { aliasHpp?: boolean; skipNames?: ReadonlySet<string> },
): Promise<void> => {
    const aliasHpp = options?.aliasHpp ?? true;
    const skipNames = options?.skipNames;
    const files = await collectFiles(root);
    for (const file of files) {
        const rel = relative(root, file).replaceAll("\\", "/");
        if (rel.includes("..")) {
            continue;
        }
        const baseName = rel.split("/").pop() ?? "";
        if (skipNames?.has(baseName)) {
            continue;
        }
        bundle.files[`${destPrefix}/${rel}`] = await readFile(file, "utf8");
        if (aliasHpp && rel.endsWith(".hpp")) {
            bundle.files[`${destPrefix}/${rel.slice(0, -4)}`] = bundle.files[`${destPrefix}/${rel}`];
        }
    }
};

export type CppRuntimeCache = {
    cacheDir: string;
    runtimeDir: string;
    includeJsonPath: string;
};

const projectRootFromCacheDir = (cacheDir: string): string => resolve(cacheDir, "../../..");

export const ensureCppRuntimeCache = async (cacheDir: string): Promise<CppRuntimeCache> => {
    const downloadsDir = resolve(cacheDir, "downloads");
    const extractDir = resolve(cacheDir, "extract");
    const runtimeDir = resolve(cacheDir, "runtime");
    const includeJsonPath = resolve(runtimeDir, CPP_INCLUDE_BUNDLE_FILE_NAME);
    const distDir = resolve(projectRootFromCacheDir(cacheDir), CPP_LOCAL_DIST_REL);
    const gnuCompatDir = resolve(projectRootFromCacheDir(cacheDir), CPP_GNU_COMPAT_DIST_REL);
    await mkdir(downloadsDir, { recursive: true });
    await mkdir(runtimeDir, { recursive: true });

    try {
        await access(resolve(gnuCompatDir, "ext/pb_ds/assoc_container.hpp"));
    } catch (error) {
        if (isErrnoException(error) && error.code === "ENOENT") {
            throw new Error(`AIBP: missing ${gnuCompatDir}. Run pnpm run build:engine:clang`);
        }
        throw error;
    }

    for (const fileName of CPP_TOOL_FILES) {
        const srcPath = resolve(distDir, fileName);
        const destPath = resolve(runtimeDir, fileName);
        try {
            await access(srcPath);
        } catch (error) {
            if (isErrnoException(error) && error.code === "ENOENT") {
                throw new Error(`AIBP: missing ${srcPath}. Run pnpm run build:engine:clang`);
            }
            throw error;
        }
        if (fileName.endsWith(".js")) {
            const patched = patchToolJs(await readFile(srcPath, "utf8"), fileName);
            await writeFile(destPath, patched);
        } else {
            try {
                await access(destPath);
            } catch (error) {
                if (!isErrnoException(error) || error.code !== "ENOENT") {
                    throw error;
                }
                await copyFile(srcPath, destPath);
            }
        }
    }

    const aclArchive = await ensureCachedFile({
        destPath: resolve(downloadsDir, `ac-library-${ACL_VERSION}.tar.gz`),
        url: ACL_TARBALL_URL,
    });
    const aclExtract = resolve(extractDir, `ac-library-${ACL_VERSION}`);
    const aclMarker = resolve(aclExtract, ".extracted");
    try {
        await readFile(aclMarker);
    } catch {
        await rm(aclExtract, { recursive: true, force: true });
        await extractTar(aclArchive, aclExtract);
        await writeFile(aclMarker, "ok");
    }

    const bundle: CppIncludeBundle = { files: {} };
    bundle.files["include/bits/stdc++.h"] = await readFile(stdcxxHeaderPath(), "utf8");
    bundle.files["include/bits/extc++.h"] = await readFile(extcxxHeaderPath(), "utf8");
    await addTreeToBundle(bundle, gnuCompatDir, "include", {
        aliasHpp: false,
        skipNames: new Set([".stamp"]),
    });
    await addTreeToBundle(bundle, cppShimsDirPath(), "include", { aliasHpp: false });

    const aclFiles = await collectFiles(aclExtract);
    const atcoderDir = aclFiles
        .map((file) => file.replaceAll("\\", "/"))
        .find((file) => file.endsWith("/atcoder/dsu.hpp"))
        ?.replace(/\/dsu\.hpp$/, "");
    if (!atcoderDir) {
        throw new Error("AIBP: ac-library is missing atcoder/dsu.hpp");
    }
    await addTreeToBundle(bundle, atcoderDir, "include/atcoder");

    const includeJson = JSON.stringify(bundle);
    const includeJsonBytes = Buffer.byteLength(includeJson, "utf8");
    if (includeJsonBytes > CPP_INCLUDE_BUNDLE_MAX_BYTES) {
        throw new Error(
            `AIBP: ${CPP_INCLUDE_BUNDLE_FILE_NAME} is ${includeJsonBytes} bytes (AMO non-binary limit ${CPP_INCLUDE_BUNDLE_MAX_BYTES})`,
        );
    }
    await writeFile(includeJsonPath, includeJson);
    return { cacheDir, runtimeDir, includeJsonPath };
};

const pushPublicFile = (
    files: ResolvedPublicFile[],
    existing: Set<string>,
    absoluteSrc: string,
    fileName: string,
    wxt: Wxt,
): void => {
    const relativeDest = `${CPP_PUBLIC_ASSETS_BASE}/${fileName}`;
    if (existing.has(relativeDest)) {
        wxt.logger.warn(`AIBP: Skipped duplicate public asset: ${relativeDest}`);
        return;
    }
    files.push({ absoluteSrc, relativeDest });
    existing.add(relativeDest);
};

export const registerCppPublicAssets = async (wxt: Wxt, files: ResolvedPublicFile[]): Promise<void> => {
    const cacheDir = resolve(wxt.config.wxtDir, cppCacheSubdir());
    const cache = await ensureCppRuntimeCache(cacheDir);
    const existing = new Set(files.map((file) => file.relativeDest));
    for (const fileName of CPP_TOOL_FILES) {
        pushPublicFile(files, existing, resolve(cache.runtimeDir, fileName), fileName, wxt);
    }
    pushPublicFile(files, existing, cache.includeJsonPath, CPP_INCLUDE_BUNDLE_FILE_NAME, wxt);
    wxt.logger.info("AIBP: Added C++ public assets (WASI Clang 21.1.0 + pb_ds).");
};

export const cppDefaultCacheDir = (projectRoot: string): string => resolve(projectRoot, ".wxt", cppCacheSubdir());
