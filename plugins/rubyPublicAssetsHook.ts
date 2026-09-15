// ================================================================================================
// WXT: ruby.wasm + 純 Ruby gem を public assets に同梱する
// ================================================================================================

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type { ResolvedPublicFile, Wxt } from "wxt";
import {
    gemDownloadUrl,
    gemRequirePaths,
    RUBY_GEMS,
    RUBY_GEMS_JSON_FILE_NAME,
    RUBY_PUBLIC_ASSETS_BASE,
    RUBY_WASM_FILE_NAME,
    RUBY_WASM_URL,
    rubyCacheSubdir,
    rubyGemsStamp,
    type RubyGemsBundle,
} from "../utils/execution/languages/ruby/gems";

type TarEntry = {
    name: string;
    type: string;
    data: Uint8Array;
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
    error instanceof Error && "code" in error && typeof (error as NodeJS.ErrnoException).code === "string";

const sha256Hex = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const decodeCString = (bytes: Uint8Array): string => {
    const zero = bytes.indexOf(0);
    const slice = zero === -1 ? bytes : bytes.subarray(0, zero);
    return new TextDecoder("utf-8").decode(slice);
};

/** ustar / GNU tar の最小パーサ（gem 同梱用） */
const readTarEntries = (buf: Uint8Array): TarEntry[] => {
    const entries: TarEntry[] = [];
    let offset = 0;
    let pendingLongName: string | undefined;
    const decoder = new TextDecoder("utf-8");

    while (offset + 512 <= buf.length) {
        const header = buf.subarray(offset, offset + 512);
        if (header.every((byte) => byte === 0)) {
            break;
        }

        const sizeField = decodeCString(header.subarray(124, 136)).trim();
        const size = Number.parseInt(sizeField, 8);
        const dataSize = Number.isFinite(size) ? size : 0;
        const type = String.fromCharCode(header[156] ?? 48) || "0";
        const name = decodeCString(header.subarray(0, 100));
        const prefix = decodeCString(header.subarray(345, 500));
        const fullName = pendingLongName ?? (prefix === "" ? name : `${prefix}/${name}`);
        pendingLongName = undefined;

        offset += 512;
        const data = buf.subarray(offset, offset + dataSize);
        offset += Math.ceil(dataSize / 512) * 512;

        if (type === "L") {
            let longName = decoder.decode(data);
            while (longName.endsWith("\u0000")) {
                longName = longName.slice(0, -1);
            }
            pendingLongName = longName;
            continue;
        }
        entries.push({ name: fullName, type, data: new Uint8Array(data) });
    }

    return entries;
};

const downloadBytes = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`AIBP: Failed to download ${url} (HTTP ${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
};

const resolveOrDownload = async (params: {
    filePath: string;
    url: string;
    expectedSha256?: string;
}): Promise<Uint8Array> => {
    const { filePath, url, expectedSha256 } = params;
    try {
        const cached = await readFile(filePath);
        if (!expectedSha256 || sha256Hex(cached) === expectedSha256.toLowerCase()) {
            return cached;
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
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
    return bytes;
};

const isUnderRequirePath = (name: string, requirePath: string): boolean =>
    name === `${requirePath}.rb` || name.startsWith(`${requirePath}/`);

const extractGemRubyFiles = (gemBytes: Uint8Array, requirePaths: readonly string[]): Record<string, string> => {
    const outer = readTarEntries(gemBytes);
    const dataTarGz = outer.find((entry) => entry.name === "data.tar.gz" || entry.name.endsWith("/data.tar.gz"));
    if (!dataTarGz) {
        throw new Error("AIBP: gem archive missing data.tar.gz");
    }

    const inner = readTarEntries(gunzipSync(dataTarGz.data));
    const decoder = new TextDecoder("utf-8");
    const files: Record<string, string> = {};

    for (const entry of inner) {
        if (entry.type !== "0" && entry.type !== "\0") {
            continue;
        }
        const name = entry.name.replace(/^\.\//, "");
        if (!name.endsWith(".rb") || name.includes("..")) {
            continue;
        }
        if (!requirePaths.some((requirePath) => isUnderRequirePath(name, requirePath))) {
            continue;
        }
        files[name] = decoder.decode(entry.data);
    }

    return files;
};

const buildGemsBundle = async (gemsCacheDir: string): Promise<RubyGemsBundle> => {
    const files: Record<string, string> = {};
    const loadPaths: string[] = [];
    await mkdir(gemsCacheDir, { recursive: true });

    for (const gem of RUBY_GEMS) {
        const gemFileName = `${gem.name}-${gem.version}.gem`;
        const gemBytes = await resolveOrDownload({
            filePath: resolve(gemsCacheDir, gemFileName),
            url: gemDownloadUrl(gem),
            expectedSha256: gem.sha256,
        });
        const requirePaths = gemRequirePaths(gem);
        for (const requirePath of requirePaths) {
            loadPaths.push(`${gem.name}/${requirePath}`);
        }
        const extracted = extractGemRubyFiles(gemBytes, requirePaths);
        for (const [relativePath, source] of Object.entries(extracted)) {
            files[`${gem.name}/${relativePath}`] = source;
        }
    }

    return { stamp: rubyGemsStamp(), loadPaths, files };
};

export type RubyRuntimeCache = {
    cacheDir: string;
    wasmPath: string;
    gemsJsonPath: string;
};

/** ビルドフックと Vitest が共有するキャッシュ（`.wxt/aibp-ruby-cache/`） */
export const ensureRubyRuntimeCache = async (cacheDir: string): Promise<RubyRuntimeCache> => {
    await mkdir(cacheDir, { recursive: true });
    const wasmPath = resolve(cacheDir, RUBY_WASM_FILE_NAME);
    const gemsJsonPath = resolve(cacheDir, RUBY_GEMS_JSON_FILE_NAME);

    await resolveOrDownload({ filePath: wasmPath, url: RUBY_WASM_URL });

    let bundle: RubyGemsBundle | undefined;
    try {
        const existing = JSON.parse(await readFile(gemsJsonPath, "utf8")) as RubyGemsBundle;
        if (
            existing.stamp === rubyGemsStamp() &&
            Array.isArray(existing.loadPaths) &&
            existing.loadPaths.length > 0 &&
            existing.files &&
            Object.keys(existing.files).length > 0
        ) {
            bundle = existing;
        }
    } catch (error) {
        if (!isErrnoException(error) || error.code !== "ENOENT") {
            // 壊れた JSON は作り直す
            if (!(error instanceof SyntaxError)) {
                throw error;
            }
        }
    }

    if (!bundle) {
        bundle = await buildGemsBundle(resolve(cacheDir, "gems"));
        await writeFile(gemsJsonPath, JSON.stringify(bundle));
    }

    return { cacheDir, wasmPath, gemsJsonPath };
};

const pushPublicFile = (
    files: ResolvedPublicFile[],
    existing: Set<string>,
    absoluteSrc: string,
    fileName: string,
    wxt: Wxt,
): void => {
    const relativeDest = `${RUBY_PUBLIC_ASSETS_BASE}/${fileName}`;
    if (existing.has(relativeDest)) {
        wxt.logger.warn(`AIBP: Skipped duplicate public asset: ${relativeDest}`);
        return;
    }
    files.push({ absoluteSrc, relativeDest });
    existing.add(relativeDest);
};

export const registerRubyPublicAssets = async (wxt: Wxt, files: ResolvedPublicFile[]): Promise<void> => {
    const cacheDir = resolve(wxt.config.wxtDir, rubyCacheSubdir());
    const cache = await ensureRubyRuntimeCache(cacheDir);
    const existing = new Set(files.map((file) => file.relativeDest));
    pushPublicFile(files, existing, cache.wasmPath, RUBY_WASM_FILE_NAME, wxt);
    pushPublicFile(files, existing, cache.gemsJsonPath, RUBY_GEMS_JSON_FILE_NAME, wxt);
    wxt.logger.info(`AIBP: Added Ruby public assets (${RUBY_WASM_FILE_NAME}, ${RUBY_GEMS_JSON_FILE_NAME}).`);
};

export const rubyDefaultCacheDir = (projectRoot: string): string => resolve(projectRoot, ".wxt", rubyCacheSubdir());
