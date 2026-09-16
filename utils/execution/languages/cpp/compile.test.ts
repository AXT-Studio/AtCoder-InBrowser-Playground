import { describe, expect, it } from "vitest";
import { parseDriverDump, tarContents } from "./compile";

describe("cpp compile helpers", () => {
    it("parses ustar members", () => {
        const encoder = new TextEncoder();
        const block = new Uint8Array(512 + 512);
        const name = encoder.encode("include/foo.h");
        block.set(name, 0);
        const size = encoder.encode("00000000005");
        block.set(size, 124);
        encoder.encode("hello").forEach((byte, index) => {
            block[512 + index] = byte;
        });
        const entries = tarContents(block);
        expect(entries).toHaveLength(1);
        expect(entries[0]?.name).toBe("include/foo.h");
        expect(new TextDecoder().decode(entries[0]?.content)).toBe("hello");
    });

    it("parses clang -### cc1 and wasm-ld lines", () => {
        const dump = `
clang: warning: unused
 "/sys/clang-20" "-cc1" "-triple" "wasm32-wasi" "-o" "/tmp/Main.o" "-x" "c++" "Main.cpp"
 "/sys/wasm-ld" "-m" "wasm32" "crt1.o" "/tmp/Main.o" "-lc++" "-o" "/tmp/a.out"
`;
        expect(parseDriverDump(dump)).toEqual({
            compilerArgs: ["-cc1", "-triple", "wasm32-wasi", "-o", "/tmp/Main.o", "-x", "c++", "Main.cpp"],
            compilerArtifact: "/tmp/Main.o",
            linkerArgs: ["-m", "wasm32", "crt1.o", "/tmp/Main.o", "-lc++", "-o", "/tmp/a.out"],
            linkerArtifact: "/tmp/a.out",
        });
    });
});
