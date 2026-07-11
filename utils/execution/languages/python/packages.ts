// ================================================================================================
// Python: allowlist → micropip.install 引数
// ================================================================================================

import type { PyodideInterface } from "pyodide";
import { extractImports } from "./extractImports";

/**
 * import 名 → micropip.install 引数。
 * - 通常は lock 上のパッケージ名（indexURL から取得）
 * - `wheel:` 接頭辞は同梱 wheel ファイル名（拡張内 URL / Vitest では PyPI 名へフォールバック）
 *
 * scipy / matplotlib は allowlist に入れない（DECISIONS.md）。
 * networkx は lock 依存で matplotlib を引くため、同梱 pure wheel を URL インストールする。
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

export const resolveMicropipRequirement = (requirement: string): string => {
    if (!requirement.startsWith("wheel:")) {
        return requirement;
    }

    const fileName = requirement.slice("wheel:".length);
    const baseURL = resolveWheelBaseURL();
    if (baseURL) {
        return new URL(fileName, baseURL).href;
    }

    const fallback = BUNDLED_WHEEL_FALLBACK_PACKAGE[fileName];
    if (fallback) {
        return fallback;
    }

    throw new Error(`Cannot resolve bundled wheel requirement: ${fileName}`);
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
    const micropip = pyodide.pyimport("micropip");
    const resolved = requirements.map(resolveMicropipRequirement);
    await micropip.install(resolved);
};
