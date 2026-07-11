// ================================================================================================
// WXT: Pyodide ランタイム + allowlist wheel を public assets に同梱する
// ================================================================================================

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import type { ResolvedPublicFile, Wxt } from "wxt";

const PYODIDE_RUNTIME_FILES = [
    "pyodide.mjs",
    "pyodide.asm.mjs",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip",
] as const;

const PYODIDE_PUBLIC_ASSETS_BASE = "assets/pyodide";
const PYODIDE_CACHE_DIR_NAME = "aibp-pyodide-cache";

/** lock から取るルート。networkx は matplotlib 依存を歩かない */
const LOCK_PACKAGE_ROOTS: ReadonlyArray<{ name: string; walkDepends: boolean }> = [
    { name: "micropip", walkDepends: true },
    { name: "numpy", walkDepends: true },
    { name: "bitarray", walkDepends: true },
    { name: "sympy", walkDepends: true },
    { name: "sortedcontainers", walkDepends: true },
    { name: "more-itertools", walkDepends: true },
    { name: "networkx", walkDepends: false },
];

/** 同梱しない（scipy 切断。matplotlib は明示サポート外） */
const EXCLUDED_LOCK_PACKAGES = new Set(["scipy", "matplotlib"]);

/** PyPI のみ（Pyodide 配布外） */
const PYPI_WHEELS: ReadonlyArray<{ fileName: string; url: string }> = [
    {
        fileName: "ac_library_python-0.1.0-py3-none-any.whl",
        url: "https://files.pythonhosted.org/packages/04/a5/2327a9e3e9c311d6caa56e05d0ed656a986160eb961f99cc09962045c0e4/ac_library_python-0.1.0-py3-none-any.whl",
    },
];

type LockPackageEntry = {
    depends?: string[];
    file_name?: string;
    sha256?: string;
};

type PyodideLockFile = {
    packages?: Record<string, LockPackageEntry>;
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
    error instanceof Error && "code" in error && typeof (error as NodeJS.ErrnoException).code === "string";

const sha256Hex = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const withTrailingSlash = (url: string): string => (url.endsWith("/") ? url : `${url}/`);

const normalizeVersion = (versionRaw: string): string => {
    const matched = versionRaw.match(/\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.-]+)?/);
    if (!matched) {
        throw new Error(`AIBP: Could not normalize Pyodide version: ${versionRaw}`);
    }
    return matched[0];
};

const collectLockFileNames = (lockPackages: Record<string, LockPackageEntry>): Map<string, string | undefined> => {
    /** fileName → expectedSha256 */
    const artifacts = new Map<string, string | undefined>();
    const visited = new Set<string>();

    for (const root of LOCK_PACKAGE_ROOTS) {
        const stack = [root.name];
        const walkDepends = root.walkDepends;

        while (stack.length > 0) {
            const packageName = stack.pop();
            if (!packageName || visited.has(packageName) || EXCLUDED_LOCK_PACKAGES.has(packageName)) {
                continue;
            }

            const entry = lockPackages[packageName];
            if (!entry?.file_name) {
                throw new Error(`AIBP: Package ${packageName} missing from pyodide-lock.json`);
            }

            visited.add(packageName);
            if (!artifacts.has(entry.file_name)) {
                artifacts.set(entry.file_name, entry.sha256);
            }

            if (!walkDepends) {
                continue;
            }
            for (const dep of entry.depends ?? []) {
                if (!EXCLUDED_LOCK_PACKAGES.has(dep)) {
                    stack.push(dep);
                }
            }
        }
    }

    return artifacts;
};

const downloadBytes = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`AIBP: Failed to download ${url} (HTTP ${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
};

const resolveOrDownloadArtifact = async (params: {
    fileName: string;
    localDirs: readonly string[];
    cdnBaseUrl?: string;
    directUrl?: string;
    expectedSha256?: string;
    cacheDir: string;
}): Promise<string> => {
    const { fileName, localDirs, cdnBaseUrl, directUrl, expectedSha256, cacheDir } = params;

    for (const dir of localDirs) {
        const localPath = resolve(dir, fileName);
        try {
            const bytes = await readFile(localPath);
            if (expectedSha256 && sha256Hex(bytes) !== expectedSha256.toLowerCase()) {
                continue;
            }
            return localPath;
        } catch (error) {
            if (!isErrnoException(error) || error.code !== "ENOENT") {
                throw error;
            }
        }
    }

    const url = directUrl ?? (cdnBaseUrl ? `${withTrailingSlash(cdnBaseUrl)}${fileName}` : undefined);
    if (!url) {
        throw new Error(`AIBP: No download URL for ${fileName}`);
    }

    const cachePath = resolve(cacheDir, fileName);
    try {
        const cached = await readFile(cachePath);
        if (!expectedSha256 || sha256Hex(cached) === expectedSha256.toLowerCase()) {
            return cachePath;
        }
    } catch (error) {
        if (!isErrnoException(error) || error.code !== "ENOENT") {
            throw error;
        }
    }

    const bytes = await downloadBytes(url);
    if (expectedSha256 && sha256Hex(bytes) !== expectedSha256.toLowerCase()) {
        throw new Error(`AIBP: SHA256 mismatch for ${fileName}`);
    }
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, bytes);
    return cachePath;
};

const pushPublicFile = (
    files: ResolvedPublicFile[],
    existing: Set<string>,
    absoluteSrc: string,
    fileName: string,
    wxt: Wxt,
): boolean => {
    const relativeDest = `${PYODIDE_PUBLIC_ASSETS_BASE}/${fileName}`;
    if (existing.has(relativeDest)) {
        wxt.logger.warn(`AIBP: Skipped duplicate public asset: ${relativeDest}`);
        return false;
    }
    files.push({ absoluteSrc, relativeDest });
    existing.add(relativeDest);
    return true;
};

export const registerPyodidePublicAssets = async (wxt: Wxt, files: ResolvedPublicFile[]): Promise<void> => {
    const require = createRequire(import.meta.url);
    const pyodidePackageJsonPath = require.resolve("pyodide/package.json");
    const pyodidePackageDir = resolve(pyodidePackageJsonPath, "..");
    const pyodideVersion = normalizeVersion(
        (JSON.parse(await readFile(pyodidePackageJsonPath, "utf8")) as { version: string }).version,
    );
    const cdnBaseUrl = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`;
    const cacheDir = resolve(wxt.config.wxtDir, PYODIDE_CACHE_DIR_NAME, `v${pyodideVersion}`);
    const localDirs = [pyodidePackageDir, resolve(pyodidePackageDir, "dist")] as const;

    const lockBytes = await readFile(resolve(pyodidePackageDir, "pyodide-lock.json"));
    const lock = JSON.parse(new TextDecoder().decode(lockBytes)) as PyodideLockFile;
    if (!lock.packages) {
        throw new Error("AIBP: Invalid pyodide-lock.json");
    }

    const existing = new Set(files.map((file) => file.relativeDest));
    let added = 0;

    for (const fileName of PYODIDE_RUNTIME_FILES) {
        const absoluteSrc = await resolveOrDownloadArtifact({
            fileName,
            localDirs,
            cdnBaseUrl,
            cacheDir,
        });
        if (pushPublicFile(files, existing, absoluteSrc, fileName, wxt)) {
            added += 1;
        }
    }

    const lockArtifacts = collectLockFileNames(lock.packages);
    for (const [fileName, expectedSha256] of lockArtifacts) {
        const absoluteSrc = await resolveOrDownloadArtifact({
            fileName,
            localDirs,
            cdnBaseUrl,
            expectedSha256,
            cacheDir,
        });
        if (pushPublicFile(files, existing, absoluteSrc, fileName, wxt)) {
            added += 1;
            wxt.logger.info(`AIBP: Added Pyodide wheel ${fileName}`);
        }
    }

    for (const wheel of PYPI_WHEELS) {
        const absoluteSrc = await resolveOrDownloadArtifact({
            fileName: wheel.fileName,
            localDirs,
            directUrl: wheel.url,
            cacheDir,
        });
        if (pushPublicFile(files, existing, absoluteSrc, wheel.fileName, wxt)) {
            added += 1;
            wxt.logger.info(`AIBP: Added PyPI wheel ${wheel.fileName}`);
        }
    }

    wxt.logger.info(`AIBP: Added ${added} Pyodide public assets (runtime + allowlist wheels).`);
};
