// ================================================================================================
// Python: allowlist → micropip.install
// ================================================================================================

import type { PyodideInterface } from "pyodide";
import { extractImports } from "./extractImports";

/**
 * import 名 → micropip.install 引数。
 * - 通常は lock 上のパッケージ名（indexURL から取得）
 * - `wheel:` 接頭辞は同梱 wheel ファイル名
 *   （拡張内では fetch → Emscripten FS → `emfs:`。Vitest/Node では PyPI 名へフォールバック）
 *
 * scipy / matplotlib は allowlist に入れない（DECISIONS.md）。
 * networkx は lock 依存で matplotlib を引くため、同梱 pure wheel を emfs 経由で入れる。
 */
export const IMPORT_TO_MICROPIP_REQUIREMENT: Readonly<Record<string, string>> = {
    numpy: "numpy",
    bitarray: "bitarray",
    sympy: "sympy",
    mpmath: "mpmath",
    sortedcontainers: "sortedcontainers",
    more_itertools: "more-itertools",
    networkx: "wheel:networkx-3.6.1-py3-none-any.whl",
    atcoder: "wheel:ac_library_python-0.1.0-py3-none-any.whl",
};

/** Vitest / Node 向け: 同梱 URL が無いときの wheel → パッケージ名 */
const BUNDLED_WHEEL_FALLBACK_PACKAGE: Readonly<Record<string, string>> = {
    "networkx-3.6.1-py3-none-any.whl": "networkx",
    "ac_library_python-0.1.0-py3-none-any.whl": "ac-library-python",
};

const WHEEL_FS_DIR = "/tmp/aibp-wheels";

type Micropip = {
    install: (requirements: string | string[]) => Promise<void>;
};

const resolveWheelBaseURL = (): string | undefined => {
    if (typeof self === "undefined" || !self.location) {
        return undefined;
    }
    const { protocol, origin } = self.location;
    if (protocol === "chrome-extension:" || protocol === "moz-extension:") {
        return new URL("/assets/pyodide/", `${origin}/`).toString();
    }
    return undefined;
};

/** テスト用: wheel: の解決結果（拡張内では emfs 経路のため URL は返さない） */
export const resolveMicropipRequirementForTest = (requirement: string): string => {
    if (!requirement.startsWith("wheel:")) {
        return requirement;
    }
    const fileName = requirement.slice("wheel:".length);
    const fallback = BUNDLED_WHEEL_FALLBACK_PACKAGE[fileName];
    if (fallback) {
        return fallback;
    }
    throw new Error(`Cannot resolve bundled wheel requirement: ${fileName}`);
};

/**
 * micropip は `moz-extension:` / `chrome-extension:` を remote URL とみなさず拒否する。
 * そのため同梱 wheel は JS の fetch（拡張内では可）→ FS 書き込み → `emfs:` で入れる。
 */
const installBundledWheel = async (
    pyodide: PyodideInterface,
    micropip: Micropip,
    fileName: string,
): Promise<void> => {
    const baseURL = resolveWheelBaseURL();
    if (!baseURL) {
        const fallback = BUNDLED_WHEEL_FALLBACK_PACKAGE[fileName];
        if (!fallback) {
            throw new Error(`Cannot resolve bundled wheel requirement: ${fileName}`);
        }
        await micropip.install(fallback);
        return;
    }

    const url = new URL(fileName, baseURL).href;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch bundled wheel ${fileName} (${response.status})`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    pyodide.FS.mkdirTree(WHEEL_FS_DIR);
    const fsPath = `${WHEEL_FS_DIR}/${fileName}`;
    pyodide.FS.writeFile(fsPath, bytes);
    await micropip.install(`emfs:${fsPath}`);
};

/** コードの import のうち allowlist にあるものを micropip で入れる（先に micropip 自体を loadPackage） */
export const ensureAllowlistedPackages = async (
    pyodide: PyodideInterface,
    code: string,
): Promise<void> => {
    const requirements = [
        ...new Set(
            extractImports(code)
                .map((name) => IMPORT_TO_MICROPIP_REQUIREMENT[name])
                .filter((req): req is string => typeof req === "string"),
        ),
    ];
    if (requirements.length === 0) {
        return;
    }

    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip") as Micropip;

    const named: string[] = [];
    const wheelFiles: string[] = [];
    for (const requirement of requirements) {
        if (requirement.startsWith("wheel:")) {
            wheelFiles.push(requirement.slice("wheel:".length));
        } else {
            named.push(requirement);
        }
    }

    if (named.length > 0) {
        await micropip.install(named);
    }
    for (const fileName of wheelFiles) {
        await installBundledWheel(pyodide, micropip, fileName);
    }
};
