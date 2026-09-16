import { describe, expect, it } from "vitest";
import { AIBP_MAIN_NAME, wrapMain } from "./wrapMain";

describe("wrapMain", () => {
    it("int main() を aibp_main にリネームし、flush 用 RAII を入れる", () => {
        const result = wrapMain(`#include <iostream>
int main() {
    std::cout << 1;
    return 0;
}
`);
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.entryName).toBe(AIBP_MAIN_NAME);
        expect(result.symbol).toBe("_Z9aibp_mainv");
        expect(result.source).toContain(`int ${AIBP_MAIN_NAME}()`);
        expect(result.source).not.toMatch(/\bint\s+main\s*\(/);
        expect(result.source).toContain("struct AibpFlush");
        expect(result.source).toContain("std::cout.flush()");
        expect(result.source).toContain("std::cin.clear()");
    });

    it("呼び出しごとに別のエントリ名を付けられる", () => {
        const result = wrapMain("int main() { return 0; }\n", "aibp_main_3");
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.entryName).toBe("aibp_main_3");
        expect(result.symbol).toBe("_Z11aibp_main_3v");
        expect(result.source).toContain("int aibp_main_3()");
        expect(result.source).not.toMatch(/\bint\s+main\s*\(/);
    });

    it("int main(int argc, char** argv) も無引数 aibp_main にする", () => {
        const result = wrapMain(`int main(int argc, char** argv) {\n    return 0;\n}\n`);
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.source).toContain(`int ${AIBP_MAIN_NAME}()`);
        expect(result.source).not.toMatch(/\bint\s+main\s*\(/);
    });

    it("main が無いと失敗する", () => {
        const result = wrapMain("int foo() { return 0; }\n");
        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }
        expect(result.reason).toMatch(/int main/);
    });
});
