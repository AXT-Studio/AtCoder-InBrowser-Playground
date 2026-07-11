import { beforeAll, describe, expect, it } from "vitest";
import { python, type LanguageContext } from "./module";

describe("python language module (stdlib)", () => {
    let ctx: LanguageContext;

    beforeAll(async () => {
        ctx = await python.init();
    }, 60_000);

    it("print を stdout に出す", async () => {
        const outcome = await python.run(ctx, `print("hello")`, "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "hello\n",
            stderr: "",
        });
    });

    it("stdin を1行ずつ読める", async () => {
        const outcome = await python.run(
            ctx,
            `
a, b = map(int, input().split())
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

    it("構文エラーは CE になる", async () => {
        const outcome = await python.run(ctx, `print(`, "");
        expect(outcome.status).toBe("CE");
        expect(outcome.stderr).toMatch(/SyntaxError/);
    });

    it("実行時エラーは RE になる", async () => {
        const outcome = await python.run(ctx, `raise ValueError("nope")`, "");
        expect(outcome.status).toBe("RE");
        expect(outcome.stderr).toMatch(/ValueError/);
        expect(outcome.stderr).toMatch(/nope/);
    });
});
