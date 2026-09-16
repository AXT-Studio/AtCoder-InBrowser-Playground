// ================================================================================================
// WXT: xeus-cpp (Clang 21) + ACL + bits/stdc++.h を public assets に同梱する
// ================================================================================================

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { ResolvedPublicFile, Wxt } from "wxt";
import {
    ACL_TARBALL_URL,
    ACL_VERSION,
    CPP_CHANNEL_BASE,
    CPP_CONDA_PACKAGES,
    CPP_INCLUDE_BUNDLE_FILE_NAME,
    CPP_INCLUDE_BUNDLE_MAX_BYTES,
    CPP_PUBLIC_ASSETS_BASE,
    CPP_RUNTIME_FILES,
    cppCacheSubdir,
    type CppIncludeBundle,
} from "../utils/execution/languages/cpp/assets";

const execFileAsync = promisify(execFile);

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
    error instanceof Error && "code" in error && typeof (error as NodeJS.ErrnoException).code === "string";

const sha256Hex = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const stdcxxHeaderPath = (): string =>
    resolve(dirname(fileURLToPath(import.meta.url)), "../utils/execution/languages/cpp/stdc++.h");

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

const findExtractedFile = (files: readonly string[], suffix: string): string | undefined => {
    const normalized = suffix.replaceAll("\\", "/");
    return files.find((file) => file.replaceAll("\\", "/").endsWith(normalized));
};

/**
 * emscripten-forge の xcpp.js は WEB/WORKER 専用で、Node の readAsync が空。
 * Vitest は window を持つことがあるので、NODE を WEB/WORKER より優先する。
 * キャッシュ成果物は UMD + `export default`（拡張 Worker が moz-extension URL を直接 import する）。
 * Vitest は `export default` を外して CJS として評価する。
 */
const NODE_ENV_READ_NEEDLE = "var readAsync,readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){";
const NODE_ENV_READ_REPLACEMENT =
    'var readAsync,readBinary;if(!(typeof process=="object"&&process.versions?.node)&&(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)){';
const NODE_READ_NEEDLE = "}else{}var out=console.log.bind(console);";
const NODE_READ_REPLACEMENT =
    '}else{var fs=typeof require==="function"?require("fs"):typeof process=="object"&&typeof process.getBuiltinModule==="function"?process.getBuiltinModule("fs"):null;if(!fs){throw new Error("AIBP: Node fs is unavailable for xeus-cpp")}readBinary=url=>{var b=fs.readFileSync(url);return new Uint8Array(b.buffer,b.byteOffset,b.byteLength)};readAsync=async url=>{var b=fs.readFileSync(url);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}var out=console.log.bind(console);';

const patchXcppJs = (source: string): string => {
    let patched = source.replace(/^\s*export default createXeusModule;\s*$/m, "");
    if (!patched.includes(NODE_ENV_READ_REPLACEMENT)) {
        if (!patched.includes(NODE_ENV_READ_NEEDLE)) {
            throw new Error("AIBP: xcpp.js WEB/WORKER readAsync needle was not found");
        }
        patched = patched.replace(NODE_ENV_READ_NEEDLE, NODE_ENV_READ_REPLACEMENT);
    }
    if (!patched.includes("readAsync=async url=>{var b=fs.readFileSync")) {
        if (!patched.includes(NODE_READ_NEEDLE)) {
            throw new Error("AIBP: xcpp.js Node readAsync needle was not found");
        }
        patched = patched.replace(NODE_READ_NEEDLE, NODE_READ_REPLACEMENT);
    }
    if (!patched.includes("Module.LDSO=LDSO") && !patched.includes("Module.LDSO = LDSO")) {
        const needle = 'var LDSO={loadedLibsByName:{},loadedLibsByHandle:{},init(){newDSO("__main__",0,wasmImports)}}';
        if (patched.includes(needle)) {
            patched = patched.replace(needle, `${needle};Module.LDSO=LDSO`);
        } else {
            const alt =
                /var LDSO=\{loadedLibsByName:\{\},loadedLibsByHandle:\{\},init\(\)\{newDSO\("__main__",0,wasmImports\)\}\}/;
            if (alt.test(patched)) {
                patched = patched.replace(alt, (matched) => `${matched};Module.LDSO=LDSO`);
            }
        }
    }
    if (!patched.includes("module.exports")) {
        patched +=
            '\nif (typeof module === "object" && module && module.exports) { module.exports = createXeusModule; }\n';
    }
    if (!patched.includes("export default createXeusModule")) {
        patched += "\nexport default createXeusModule;\n";
    }
    return patched;
};

const addTreeToBundle = async (bundle: CppIncludeBundle, root: string, destPrefix: string): Promise<void> => {
    const files = await collectFiles(root);
    for (const file of files) {
        const rel = relative(root, file).replaceAll("\\", "/");
        if (rel.includes("..")) {
            continue;
        }
        bundle.files[`${destPrefix}/${rel}`] = await readFile(file, "utf8");
        if (destPrefix.endsWith("/atcoder") || destPrefix === "include/atcoder") {
            if (rel.endsWith(".hpp")) {
                bundle.files[`${destPrefix}/${rel.slice(0, -4)}`] = bundle.files[`${destPrefix}/${rel}`];
            }
        }
    }
};

export type CppRuntimeCache = {
    cacheDir: string;
    runtimeDir: string;
    includeJsonPath: string;
};

export const ensureCppRuntimeCache = async (cacheDir: string): Promise<CppRuntimeCache> => {
    const downloadsDir = resolve(cacheDir, "downloads");
    const extractDir = resolve(cacheDir, "extract");
    const runtimeDir = resolve(cacheDir, "runtime");
    const includeJsonPath = resolve(runtimeDir, CPP_INCLUDE_BUNDLE_FILE_NAME);
    await mkdir(downloadsDir, { recursive: true });
    await mkdir(runtimeDir, { recursive: true });

    const extractedRoots: string[] = [];
    for (const spec of CPP_CONDA_PACKAGES) {
        const archivePath = await ensureCachedFile({
            destPath: resolve(downloadsDir, spec.fileName),
            url: `${CPP_CHANNEL_BASE}/${spec.fileName}`,
            expectedSha256: spec.sha256,
        });
        const dest = resolve(extractDir, spec.fileName.replace(/\.tar\.bz2$/, ""));
        const marker = resolve(dest, ".extracted");
        try {
            await readFile(marker);
        } catch {
            await rm(dest, { recursive: true, force: true });
            await extractTar(archivePath, dest);
            await mkdir(dest, { recursive: true });
            await writeFile(marker, "ok");
        }
        extractedRoots.push(dest);
    }

    const extractedFiles = (await Promise.all(extractedRoots.map((root) => collectFiles(root)))).flat();
    const copyNamed = async (suffixes: readonly string[], destName: string): Promise<void> => {
        const found = suffixes.map((suffix) => findExtractedFile(extractedFiles, suffix)).find(Boolean);
        if (!found) {
            throw new Error(`AIBP: Missing C++ runtime file (${destName}); tried ${suffixes.join(", ")}`);
        }
        await writeFile(resolve(runtimeDir, destName), await readFile(found));
    };

    await copyNamed(["/bin/xcpp.wasm", "/xcpp.wasm"], "xcpp.wasm");
    await copyNamed(["/bin/xcpp.data", "/xcpp.data"], "xcpp.data");
    await copyNamed(["/lib/libxeus.so", "/libxeus.so"], "libxeus.so");
    await copyNamed(
        ["/lib/libclangCppInterOp.so", "/lib/libclangCppInterOp.so.21.1", "/libclangCppInterOp.so"],
        "libclangCppInterOp.so",
    );

    const xcppJsPath =
        findExtractedFile(extractedFiles, "/bin/xcpp.js") ?? findExtractedFile(extractedFiles, "/xcpp.js");
    if (!xcppJsPath) {
        throw new Error("AIBP: Missing xcpp.js");
    }
    const patchedJs = patchXcppJs(await readFile(xcppJsPath, "utf8"));
    await writeFile(resolve(runtimeDir, "xcpp.js"), patchedJs);

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
    for (const fileName of CPP_RUNTIME_FILES) {
        pushPublicFile(files, existing, resolve(cache.runtimeDir, fileName), fileName, wxt);
    }
    pushPublicFile(files, existing, cache.includeJsonPath, CPP_INCLUDE_BUNDLE_FILE_NAME, wxt);
    wxt.logger.info("AIBP: Added C++ public assets (xeus-cpp / Clang 21.1.8).");
};

export const cppDefaultCacheDir = (projectRoot: string): string => resolve(projectRoot, ".wxt", cppCacheSubdir());
