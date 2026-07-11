import { beforeAll, describe, expect, it } from "vitest";
import { typescript, type LanguageContext } from "./typescript";

describe("typescript language module", () => {
    let ctx: LanguageContext;

    beforeAll(async () => {
        ctx = await typescript.init();
    }, 30_000);

    it("console.log を stdout に出す", async () => {
        const outcome = await typescript.run(ctx, `console.log("hello");`, "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "hello",
            stderr: "",
        });
    });

    it("console.error を stderr に出す", async () => {
        const outcome = await typescript.run(ctx, `console.error("boom");`, "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "",
            stderr: "boom",
        });
    });

    it("TypeScript の型注釈を落として実行できる", async () => {
        const outcome = await typescript.run(
            ctx,
            `
const n: number = 42;
console.log(n);
`,
            "",
        );
        expect(outcome).toEqual({
            status: "completed",
            stdout: "42",
            stderr: "",
        });
    });

    it("Node 向け stdin パターンを __stdin__ に置換する", async () => {
        const outcome = await typescript.run(
            ctx,
            `
const input = require("fs").readFileSync("/dev/stdin", "utf8");
console.log(input.trim());
`,
            "abc\n",
        );
        expect(outcome).toEqual({
            status: "completed",
            stdout: "abc",
            stderr: "",
        });
    });

    it("実行時エラーは RE になる", async () => {
        const outcome = await typescript.run(ctx, `throw new Error("nope");`, "");
        expect(outcome.status).toBe("RE");
        expect(outcome.stdout).toBe("");
        expect(outcome.stderr).toContain("nope");
    });

    it("Object.groupBy polyfill が使える", async () => {
        const outcome = await typescript.run(
            ctx,
            `
const grouped = Object.groupBy([1, 2, 3], (n) => (n % 2 === 0 ? "even" : "odd"));
console.log(grouped.odd.join(","));
console.log(grouped.even.join(","));
`,
            "",
        );
        expect(outcome).toEqual({
            status: "completed",
            stdout: "1,3\n2",
            stderr: "",
        });
    });

    it("NaN を console.log しても壊れない", async () => {
        const outcome = await typescript.run(ctx, `console.log(NaN);`, "");
        expect(outcome.status).toBe("completed");
        expect(outcome.stdout).toBe("NaN");
        expect(outcome.stderr).toBe("");
    });

    it("実際に入力されうるコードを実行できる (ABC460-C 開発者のAC提出)", async () => {
        const outcome = await typescript.run(
            ctx,
            `\
function Main(inputText: string): void {
    const input: string[][] = inputText.trim().split("\\n").map(row => row.split(" "));
    const [N, M] = input[0].map(n => +n);
    const A = input[1].map(n => +n);
    const B = input[2].map(n => +n);
    A.sort((a, b) => a - b);
    B.sort((a, b) => a - b);
    let count = 0;
    while (A.length > 0) {
        const currentA = A.pop()!;
        while (B.length > 0) {
            const currentB = B.pop()!;
            if (currentA * 2 >= currentB) {
                count++;
                break;
            }
        }
        if (A.length === 0 || A.length === 0) {
            break;
        }
    }
    console.log(count);
}

// Please do not change the following code.
export {}; // <- An empty export is required so that ts-check can determine it as a module.
Main(await Bun.file("/dev/stdin").text());
`,
            `\
8 7
2 3 4 4 4 3 2 3
8 5 5 9 9 7 1
`,
        );
        expect(outcome.status).toBe("completed");
        expect(outcome.stdout).toBe("5");
        expect(outcome.stderr).toBe("");
    });
});
