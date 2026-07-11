import { describe, expect, it } from "vitest";
import { IMPORT_TO_MICROPIP_REQUIREMENT, resolveMicropipRequirementForTest } from "./packages";

describe("python packages allowlist", () => {
    it("scipy / matplotlib は allowlist に無い", () => {
        expect(IMPORT_TO_MICROPIP_REQUIREMENT.scipy).toBeUndefined();
        expect(IMPORT_TO_MICROPIP_REQUIREMENT.matplotlib).toBeUndefined();
    });

    it("DECISIONS のサポート対象が揃っている", () => {
        expect(IMPORT_TO_MICROPIP_REQUIREMENT.numpy).toBe("numpy");
        expect(IMPORT_TO_MICROPIP_REQUIREMENT.bitarray).toBe("bitarray");
        expect(IMPORT_TO_MICROPIP_REQUIREMENT.sympy).toBe("sympy");
        expect(IMPORT_TO_MICROPIP_REQUIREMENT.sortedcontainers).toBe("sortedcontainers");
        expect(IMPORT_TO_MICROPIP_REQUIREMENT.more_itertools).toBe("more-itertools");
        expect(IMPORT_TO_MICROPIP_REQUIREMENT.networkx).toMatch(/^wheel:networkx-/);
        expect(IMPORT_TO_MICROPIP_REQUIREMENT.atcoder).toMatch(/^wheel:ac_library_python-/);
    });

    it("Node では wheel: を PyPI パッケージ名へフォールバックする", () => {
        expect(resolveMicropipRequirementForTest("numpy")).toBe("numpy");
        expect(resolveMicropipRequirementForTest("wheel:networkx-3.6.1-py3-none-any.whl")).toBe("networkx");
        expect(resolveMicropipRequirementForTest("wheel:ac_library_python-0.1.0-py3-none-any.whl")).toBe(
            "ac-library-python",
        );
    });
});
