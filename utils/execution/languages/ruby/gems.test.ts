import { describe, expect, it } from "vitest";
import { DEFERRED_NATIVE_RUBY_GEMS, RUBY_GEMS, USER_FACING_RUBY_GEMS } from "./gems";

describe("ruby gems allowlist", () => {
    it("ユーザー向けは純 Ruby の 5 gem", () => {
        expect(USER_FACING_RUBY_GEMS).toEqual([
            "ac-library-rb",
            "bitarray",
            "sorted_containers",
            "rgl",
            "faster_prime",
        ]);
    });

    it("rgl の runtime 依存も同梱する", () => {
        const names = RUBY_GEMS.map((gem) => gem.name);
        expect(names).toContain("pairing_heap");
        expect(names).toContain("stream");
        expect(RUBY_GEMS.find((gem) => gem.name === "pairing_heap")?.userFacing).toBe(false);
        expect(RUBY_GEMS.find((gem) => gem.name === "stream")?.userFacing).toBe(false);
    });

    it("ac-library-rb はジャッジと同じ require path を使う", () => {
        expect(RUBY_GEMS.find((gem) => gem.name === "ac-library-rb")?.requirePaths).toEqual([
            "lib_lock",
            "lib_helpers",
        ]);
    });

    it("C 拡張 gem は同梱しない", () => {
        const names = new Set(RUBY_GEMS.map((gem) => gem.name));
        for (const gem of DEFERRED_NATIVE_RUBY_GEMS) {
            expect(names.has(gem)).toBe(false);
        }
        expect(DEFERRED_NATIVE_RUBY_GEMS).toEqual(["bit_utils", "rbtree", "sorted_set"]);
    });
});
