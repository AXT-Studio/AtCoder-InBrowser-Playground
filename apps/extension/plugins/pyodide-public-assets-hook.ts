// ================================================================================================
// WXT hook to register required Pyodide runtime files as public assets.
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResolvedPublicFile, Wxt } from "wxt";

// ----------------------------------------------------------------
// constants
// ----------------------------------------------------------------

const PYODIDE_RUNTIME_FILES = [
    "pyodide.js",
    "pyodide.mjs",
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip",
] as const;

const LOCAL_BUNDLED_PACKAGE_ROOTS = ["micropip", "numpy", "scipy", "bitarray"] as const;

// ---- これらはmicropipでPyPIから取得するため、lock由来の同梱対象から除外する ----
const PYPI_ONLY_PACKAGES = ["sympy", "networkx", "sortedcontainers"] as const;
const PYPI_ONLY_PACKAGE_SET = new Set<string>(PYPI_ONLY_PACKAGES);

const TEST_PACKAGE_PATTERNS = [/-tests$/, /_tests$/, /-tests-/, /_tests-/];

const PYODIDE_PUBLIC_ASSETS_BASE = "assets/pyodide";
const PYODIDE_CACHE_DIR_NAME = "aibp-pyodide-cache";

type LockPackageEntry = {
    depends?: string[];
    file_name?: string;
    sha256?: string;
};

type PyodideLockFile = {
    packages?: Record<string, LockPackageEntry>;
};

type LockManagedArtifact = {
    fileName: string;
    expectedSha256?: string;
    sourcePackage: string;
};

type ResolvedArtifactSource =
    | {
          type: "local";
          absolutePath: string;
          sourceDescription: string;
      }
    | {
          type: "downloaded";
          source: Uint8Array;
          sourceDescription: string;
      };

type BundledArtifact = {
    fileName: string;
    source: ResolvedArtifactSource;
    sourcePackage?: string;
};

const artifactSourceCache = new Map<string, Promise<ResolvedArtifactSource>>();
const downloadedArtifactPathCache = new Map<string, string>();

// ----------------------------------------------------------------
// helpers
// ----------------------------------------------------------------

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
    return (
        error instanceof Error &&
        "code" in error &&
        typeof (error as NodeJS.ErrnoException).code === "string"
    );
}

function isTestPackage(packageName: string): boolean {
    return TEST_PACKAGE_PATTERNS.some((pattern) => pattern.test(packageName));
}

function parsePyodideLockFile(lockFileBytes: Uint8Array): Record<string, LockPackageEntry> {
    const lockJsonText = new TextDecoder().decode(lockFileBytes);
    let parsed: PyodideLockFile;
    try {
        parsed = JSON.parse(lockJsonText) as PyodideLockFile;
    } catch (error) {
        throw new Error(
            `AIBP: Failed to parse pyodide-lock.json (${
                error instanceof Error ? error.message : String(error)
            })`,
        );
    }

    if (
        !parsed ||
        typeof parsed !== "object" ||
        !parsed.packages ||
        typeof parsed.packages !== "object"
    ) {
        throw new Error("AIBP: Invalid pyodide-lock.json format: missing packages map.");
    }

    return parsed.packages;
}

function normalizeVersion(versionRaw: string): string {
    const matched = versionRaw.match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/);
    if (!matched) {
        throw new Error(`AIBP: Could not normalize Pyodide version: ${versionRaw}`);
    }
    return matched[0];
}

async function resolvePyodideVersion(
    extensionRootDir: string,
    pyodidePackageDir: string,
): Promise<string> {
    const localPyodidePackageJsonPath = resolve(pyodidePackageDir, "package.json");
    try {
        const localPackageJsonBytes = await readFile(localPyodidePackageJsonPath);
        const localPackageJson = JSON.parse(new TextDecoder().decode(localPackageJsonBytes)) as {
            version?: string;
        };
        if (typeof localPackageJson.version === "string") {
            return normalizeVersion(localPackageJson.version);
        }
    } catch (error) {
        if (!isErrnoException(error) || error.code !== "ENOENT") {
            throw new Error(
                `AIBP: Failed to read ${localPyodidePackageJsonPath} (${
                    error instanceof Error ? error.message : String(error)
                })`,
            );
        }
    }

    const extensionPackageJsonPath = resolve(extensionRootDir, "package.json");
    const extensionPackageJsonBytes = await readFile(extensionPackageJsonPath);
    const extensionPackageJson = JSON.parse(
        new TextDecoder().decode(extensionPackageJsonBytes),
    ) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    };
    const pyodideVersionSpec =
        extensionPackageJson.dependencies?.pyodide ?? extensionPackageJson.devDependencies?.pyodide;

    if (!pyodideVersionSpec) {
        throw new Error(
            `AIBP: Could not determine Pyodide version from ${extensionPackageJsonPath}`,
        );
    }

    return normalizeVersion(pyodideVersionSpec);
}

function sha256Hex(bytes: Uint8Array): string {
    return createHash("sha256").update(bytes).digest("hex");
}

function hasMatchingSha256(bytes: Uint8Array, expectedSha256?: string): boolean {
    if (!expectedSha256) {
        return true;
    }

    return sha256Hex(bytes).toLowerCase() === expectedSha256.toLowerCase();
}

function withTrailingSlash(url: string): string {
    return url.endsWith("/") ? url : `${url}/`;
}

async function downloadFromCdn(
    cdnBaseUrl: string,
    fileName: string,
): Promise<{ source: Uint8Array; url: string }> {
    const url = `${withTrailingSlash(cdnBaseUrl)}${fileName}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText || "(no status text)"}`);
    }

    return {
        source: new Uint8Array(await response.arrayBuffer()),
        url,
    };
}

async function resolveArtifactSourcePreferLocal(
    fileName: string,
    localSearchDirs: readonly string[],
    cdnBaseUrl: string,
    expectedSha256?: string,
): Promise<ResolvedArtifactSource> {
    const cacheKey = [cdnBaseUrl, fileName, expectedSha256 ?? "", localSearchDirs.join("|")].join(
        "::",
    );
    const cached = artifactSourceCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const loadPromise = (async (): Promise<ResolvedArtifactSource> => {
        const localMismatches: string[] = [];

        // ---- まずローカル(node_modules配下)を優先して探す ----
        for (const localDir of localSearchDirs) {
            const localPath = resolve(localDir, fileName);
            try {
                const source = await readFile(localPath);
                if (!hasMatchingSha256(source, expectedSha256)) {
                    localMismatches.push(localPath);
                    continue;
                }

                return {
                    type: "local",
                    absolutePath: localPath,
                    sourceDescription: `local:${localPath}`,
                };
            } catch (error) {
                if (isErrnoException(error) && error.code === "ENOENT") {
                    continue;
                }

                throw new Error(
                    `AIBP: Failed to read local artifact ${localPath} (${
                        error instanceof Error ? error.message : String(error)
                    })`,
                );
            }
        }

        // ---- ローカルに無ければCDNから取得する ----
        try {
            const downloaded = await downloadFromCdn(cdnBaseUrl, fileName);
            if (!hasMatchingSha256(downloaded.source, expectedSha256)) {
                throw new Error(
                    `SHA256 mismatch for CDN artifact ${downloaded.url} (expected: ${
                        expectedSha256 ?? "<none>"
                    })`,
                );
            }

            return {
                type: "downloaded",
                source: downloaded.source,
                sourceDescription: `cdn:${downloaded.url}`,
            };
        } catch (error) {
            const mismatchMessage =
                localMismatches.length === 0
                    ? ""
                    : ` local SHA256 mismatch paths: ${localMismatches.join(", ")}.`;
            throw new Error(
                `AIBP: Failed to load artifact ${fileName} from both local and CDN.${mismatchMessage} ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    })();

    artifactSourceCache.set(cacheKey, loadPromise);
    try {
        return await loadPromise;
    } catch (error) {
        artifactSourceCache.delete(cacheKey);
        throw error;
    }
}

async function readResolvedArtifactBytes(source: ResolvedArtifactSource): Promise<Uint8Array> {
    if (source.type === "downloaded") {
        return source.source;
    }

    return await readFile(source.absolutePath);
}

function collectLockManagedArtifacts(
    lockPackages: Record<string, LockPackageEntry>,
): LockManagedArtifact[] {
    const stack: string[] = [...LOCAL_BUNDLED_PACKAGE_ROOTS];
    const visited = new Set<string>();

    while (stack.length > 0) {
        const packageName = stack.pop();
        if (
            !packageName ||
            visited.has(packageName) ||
            isTestPackage(packageName) ||
            PYPI_ONLY_PACKAGE_SET.has(packageName)
        ) {
            continue;
        }

        const packageEntry = lockPackages[packageName];
        if (!packageEntry) {
            throw new Error(`AIBP: Package ${packageName} is missing from pyodide-lock.json`);
        }

        visited.add(packageName);
        for (const dependencyName of packageEntry.depends ?? []) {
            if (!isTestPackage(dependencyName) && !PYPI_ONLY_PACKAGE_SET.has(dependencyName)) {
                stack.push(dependencyName);
            }
        }
    }

    const uniqueArtifacts = new Map<string, LockManagedArtifact>();
    for (const packageName of visited) {
        const packageEntry = lockPackages[packageName];
        if (!packageEntry?.file_name) {
            throw new Error(`AIBP: Package ${packageName} has no file_name in pyodide-lock.json`);
        }

        if (!uniqueArtifacts.has(packageEntry.file_name)) {
            uniqueArtifacts.set(packageEntry.file_name, {
                fileName: packageEntry.file_name,
                expectedSha256: packageEntry.sha256,
                sourcePackage: packageName,
            });
        }
    }

    return [...uniqueArtifacts.values()];
}

function toPyodideRelativeDest(fileName: string): string {
    return `${PYODIDE_PUBLIC_ASSETS_BASE}/${fileName}`;
}

async function ensureAbsoluteSrcForAsset(
    pyodideVersion: string,
    fileName: string,
    source: ResolvedArtifactSource,
    wxtDir: string,
): Promise<string> {
    if (source.type === "local") {
        return source.absolutePath;
    }

    // ---- CDNから取得したバイナリは.wxt配下に保存し、CopiedPublicFileとして扱う ----
    const cachePath = resolve(wxtDir, PYODIDE_CACHE_DIR_NAME, `v${pyodideVersion}`, fileName);
    const cachedPath = downloadedArtifactPathCache.get(cachePath);
    if (cachedPath) {
        return cachedPath;
    }

    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, source.source);
    downloadedArtifactPathCache.set(cachePath, cachePath);
    return cachePath;
}

// ----------------------------------------------------------------
// implementation
// ----------------------------------------------------------------

export default async function bundlePyodidePublicAssetsHook(
    wxt: Wxt,
    files: ResolvedPublicFile[],
): Promise<void> {
    // ==== build:publicAssetsの1回呼び出しで、必要なPyodide資産をまとめて登録する ====
    const extensionRootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
    const pyodidePackageDir = resolve(extensionRootDir, "node_modules", "pyodide");

    const pyodideVersion = await resolvePyodideVersion(extensionRootDir, pyodidePackageDir);
    const pyodideCdnBaseUrl = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`;
    const localSearchDirs = [pyodidePackageDir, resolve(pyodidePackageDir, "dist")] as const;

    const loadedPyodideLock = await resolveArtifactSourcePreferLocal(
        "pyodide-lock.json",
        localSearchDirs,
        pyodideCdnBaseUrl,
    );
    const lockPackages = parsePyodideLockFile(await readResolvedArtifactBytes(loadedPyodideLock));
    const lockManagedArtifacts = collectLockManagedArtifacts(lockPackages);

    // ==== runtime + lock由来の資産を、ファイル名単位で一意化する ====
    const bundledArtifacts = new Map<string, BundledArtifact>();

    for (const fileName of PYODIDE_RUNTIME_FILES) {
        const source =
            fileName === "pyodide-lock.json"
                ? loadedPyodideLock
                : await resolveArtifactSourcePreferLocal(
                      fileName,
                      localSearchDirs,
                      pyodideCdnBaseUrl,
                  );
        bundledArtifacts.set(fileName, {
            fileName,
            source,
        });
    }

    for (const artifact of lockManagedArtifacts) {
        if (bundledArtifacts.has(artifact.fileName)) {
            continue;
        }

        const source = await resolveArtifactSourcePreferLocal(
            artifact.fileName,
            localSearchDirs,
            pyodideCdnBaseUrl,
            artifact.expectedSha256,
        );
        bundledArtifacts.set(artifact.fileName, {
            fileName: artifact.fileName,
            source,
            sourcePackage: artifact.sourcePackage,
        });
    }

    // ==== 既存public assetと衝突しないように、relativeDest重複はスキップする ====
    const existingRelativeDestSet = new Set(files.map((file) => file.relativeDest));
    let addedAssetCount = 0;

    for (const artifact of bundledArtifacts.values()) {
        const relativeDest = toPyodideRelativeDest(artifact.fileName);
        if (existingRelativeDestSet.has(relativeDest)) {
            wxt.logger.warn(`AIBP: Skipped duplicate public asset registration: ${relativeDest}`);
            continue;
        }

        const absoluteSrc = await ensureAbsoluteSrcForAsset(
            pyodideVersion,
            artifact.fileName,
            artifact.source,
            wxt.config.wxtDir,
        );

        files.push({
            absoluteSrc,
            relativeDest,
        });
        existingRelativeDestSet.add(relativeDest);
        addedAssetCount += 1;

        const packageLabel = artifact.sourcePackage ? ` (${artifact.sourcePackage})` : "";
        wxt.logger.info(
            `AIBP: Added Pyodide public asset ${artifact.fileName}${packageLabel} from ${artifact.source.sourceDescription}`,
        );
    }

    wxt.logger.info(`AIBP: Added ${addedAssetCount} Pyodide public assets via build:publicAssets.`);
}
