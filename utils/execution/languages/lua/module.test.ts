import { beforeAll, describe, expect, it } from "vitest";
import { lua, type LanguageContext } from "./module";

describe("lua language module", () => {
    let ctx: LanguageContext;

    beforeAll(async () => {
        ctx = await lua.init();
    }, 60_000);

    it("print を stdout に出す", async () => {
        const outcome = await lua.run(ctx, `print("hello")`, "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "hello\n",
            stderr: "",
        });
    });

    it("io.write / io.stderr をキャプチャする", async () => {
        const outcome = await lua.run(
            ctx,
            `
io.write("out")
io.stderr:write("err")
`,
            "",
        );
        expect(outcome).toEqual({
            status: "completed",
            stdout: "out",
            stderr: "err",
        });
    });

    it("io.read で stdin を読める", async () => {
        const outcome = await lua.run(
            ctx,
            `
local a, b = io.read("n", "n")
print(a + b)
`,
            "2 3\n",
        );
        expect(outcome).toEqual({
            status: "completed",
            stdout: "5\n",
            stderr: "",
        });
    });

    it("64bit 整数とビット演算が Lua 5.4 どおり", async () => {
        const outcome = await lua.run(
            ctx,
            `
print(math.maxinteger)
print(1000000000000000000 + 1)
print(1 << 40)
print(math.type(1000000000000000000))
`,
            "",
        );
        expect(outcome.status).toBe("completed");
        expect(outcome.stdout).toBe("9223372036854775807\n1000000000000000001\n1099511627776\ninteger\n");
    });

    it("構文エラーは CE になる", async () => {
        const outcome = await lua.run(ctx, `print(`, "");
        expect(outcome.status).toBe("CE");
        expect(outcome.stderr).toMatch(/unexpected symbol/);
    });

    it("実行時エラーは RE になる", async () => {
        const outcome = await lua.run(ctx, `error("boom")`, "");
        expect(outcome.status).toBe("RE");
        expect(outcome.stderr).toMatch(/boom/);
    });
});
