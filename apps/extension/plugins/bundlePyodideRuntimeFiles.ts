// ================================================================================================
// Vite plugin to bundle required Pyodide runtime files into extension assets.
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const LOCAL_BUNDLED_PACKAGE_ROOTS = [
    "micropip",
    "numpy",
    "scipy",
    "bitarray",
] as const;

// ---- これらはmicropipでPyPIから取得するため、lock由来の同梱対象から除外する ----
const PYPI_ONLY_PACKAGES = [
    "sympy",
    "networkx",
    "sortedcontainers",
] as const;
const PYPI_ONLY_PACKAGE_SET = new Set<string>(PYPI_ONLY_PACKAGES);

const TEST_PACKAGE_PATTERNS = [
    /-tests$/,
    /_tests$/,
    /-tests-/,
    /_tests-/,
];

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

type LoadedArtifact = {
    source: Uint8Array;
    sourceDescription: string;
};

const artifactLoadCache = new Map<string, Promise<LoadedArtifact>>();

type BuildPlugin = {
    name: string;
    apply: "build";
    generateBundle(this: {
        emitFile(
            file: { type: "asset"; fileName: string; source: Uint8Array },
        ): void;
    }): Promise<void>;
};

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

function parsePyodideLockFile(
    lockFileBytes: Uint8Array,
): Record<string, LockPackageEntry> {
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
        throw new Error(
            "AIBP: Invalid pyodide-lock.json format: missing packages map.",
        );
    }

    return parsed.packages;
}

function normalizeVersion(versionRaw: string): string {
    const matched = versionRaw.match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/);
    if (!matched) {
        throw new Error(
            `AIBP: Could not normalize Pyodide version: ${versionRaw}`,
        );
    }
    return matched[0];
}

async function resolvePyodideVersion(
    extensionRootDir: string,
    pyodidePackageDir: string,
): Promise<string> {
    const localPyodidePackageJsonPath = resolve(
        pyodidePackageDir,
        "package.json",
    );
    try {
        const localPackageJsonBytes = await readFile(
            localPyodidePackageJsonPath,
        );
        const localPackageJson = JSON.parse(
            new TextDecoder().decode(localPackageJsonBytes),
        ) as { version?: string };
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
    const pyodideVersionSpec = extensionPackageJson.dependencies?.pyodide ??
        extensionPackageJson.devDependencies?.pyodide;

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

function hasMatchingSha256(
    bytes: Uint8Array,
    expectedSha256?: string,
): boolean {
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
        throw new Error(
            `HTTP ${response.status} ${
                response.statusText || "(no status text)"
            }`,
        );
    }

    return {
        source: new Uint8Array(await response.arrayBuffer()),
        url,
    };
}

async function loadArtifactPreferLocal(
    fileName: string,
    localSearchDirs: readonly string[],
    cdnBaseUrl: string,
    expectedSha256?: string,
): Promise<LoadedArtifact> {
    const cacheKey = [
        cdnBaseUrl,
        fileName,
        expectedSha256 ?? "",
        localSearchDirs.join("|"),
    ].join("::");
    const cachedLoad = artifactLoadCache.get(cacheKey);
    if (cachedLoad) {
        return cachedLoad;
    }

    const loadPromise = (async (): Promise<LoadedArtifact> => {
        const localMismatches: string[] = [];

        for (const localDir of localSearchDirs) {
            const localPath = resolve(localDir, fileName);
            try {
                const source = await readFile(localPath);
                if (!hasMatchingSha256(source, expectedSha256)) {
                    localMismatches.push(localPath);
                    continue;
                }

                return {
                    source,
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
                source: downloaded.source,
                sourceDescription: `cdn:${downloaded.url}`,
            };
        } catch (error) {
            const mismatchMessage = localMismatches.length === 0
                ? ""
                : ` local SHA256 mismatch paths: ${
                    localMismatches.join(", ")
                }.`;
            throw new Error(
                `AIBP: Failed to load artifact ${fileName} from both local and CDN.${mismatchMessage} ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    })();

    artifactLoadCache.set(cacheKey, loadPromise);
    try {
        return await loadPromise;
    } catch (error) {
        artifactLoadCache.delete(cacheKey);
        throw error;
    }
}

function collectLockManagedArtifacts(
    lockPackages: Record<string, LockPackageEntry>,
): LockManagedArtifact[] {
    const stack: string[] = [...LOCAL_BUNDLED_PACKAGE_ROOTS];
    const visited = new Set<string>();

    while (stack.length > 0) {
        const packageName = stack.pop();
        if (
            !packageName || visited.has(packageName) ||
            isTestPackage(packageName) ||
            PYPI_ONLY_PACKAGE_SET.has(packageName)
        ) {
            continue;
        }

        const packageEntry = lockPackages[packageName];
        if (!packageEntry) {
            throw new Error(
                `AIBP: Package ${packageName} is missing from pyodide-lock.json`,
            );
        }

        visited.add(packageName);
        for (const dependencyName of packageEntry.depends ?? []) {
            if (
                !isTestPackage(dependencyName) &&
                !PYPI_ONLY_PACKAGE_SET.has(dependencyName)
            ) {
                stack.push(dependencyName);
            }
        }
    }

    const uniqueArtifacts = new Map<string, LockManagedArtifact>();
    for (const packageName of visited) {
        const packageEntry = lockPackages[packageName];
        if (!packageEntry?.file_name) {
            throw new Error(
                `AIBP: Package ${packageName} has no file_name in pyodide-lock.json`,
            );
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

// ----------------------------------------------------------------
// implementation
// ----------------------------------------------------------------

export default function bundlePyodideRuntimeFilesPlugin(): BuildPlugin {
    return {
        name: "aibp-bundle-pyodide-runtime-files",
        apply: "build",
        async generateBundle() {
            const extensionRootDir = resolve(
                fileURLToPath(new URL("..", import.meta.url)),
            );
            const pyodidePackageDir = resolve(
                extensionRootDir,
                "node_modules",
                "pyodide",
            );

            const pyodideVersion = await resolvePyodideVersion(
                extensionRootDir,
                pyodidePackageDir,
            );
            const pyodideCdnBaseUrl =
                `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`;
            const localSearchDirs = [
                pyodidePackageDir,
                resolve(pyodidePackageDir, "dist"),
            ] as const;

            const loadedPyodideLock = await loadArtifactPreferLocal(
                "pyodide-lock.json",
                localSearchDirs,
                pyodideCdnBaseUrl,
            );
            const lockPackages = parsePyodideLockFile(loadedPyodideLock.source);
            const lockManagedArtifacts = collectLockManagedArtifacts(
                lockPackages,
            );
            const emittedFileNames = new Set<string>();

            const emitAssetIfNeeded = (
                fileName: string,
                source: Uint8Array,
            ) => {
                if (emittedFileNames.has(fileName)) {
                    return;
                }

                this.emitFile({
                    type: "asset",
                    fileName: `assets/pyodide/${fileName}`,
                    source,
                });
                emittedFileNames.add(fileName);
            };

            for (const fileName of PYODIDE_RUNTIME_FILES) {
                if (fileName === "pyodide-lock.json") {
                    emitAssetIfNeeded(fileName, loadedPyodideLock.source);
                    continue;
                }

                const loadedRuntimeArtifact = await loadArtifactPreferLocal(
                    fileName,
                    localSearchDirs,
                    pyodideCdnBaseUrl,
                );
                console.info(
                    `AIBP: Bundled runtime artifact ${fileName} from ${loadedRuntimeArtifact.sourceDescription}`,
                );
                emitAssetIfNeeded(fileName, loadedRuntimeArtifact.source);
            }

            for (const artifact of lockManagedArtifacts) {
                const loadedLockManagedArtifact = await loadArtifactPreferLocal(
                    artifact.fileName,
                    localSearchDirs,
                    pyodideCdnBaseUrl,
                    artifact.expectedSha256,
                );
                console.info(
                    `AIBP: Bundled package artifact ${artifact.fileName} (${artifact.sourcePackage}) from ${loadedLockManagedArtifact.sourceDescription}`,
                );
                emitAssetIfNeeded(
                    artifact.fileName,
                    loadedLockManagedArtifact.source,
                );
            }

            console.info(
                `AIBP: Bundled ${emittedFileNames.size} Pyodide assets (runtime + local scientific packages).`,
            );
        },
    };
}
