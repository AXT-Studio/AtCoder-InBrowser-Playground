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

    it("allowlist 外の import は ModuleNotFoundError (RE)", async () => {
        const outcome = await python.run(ctx, `import scipy\nprint(scipy.__version__)`, "");
        expect(outcome.status).toBe("RE");
        expect(outcome.stderr).toMatch(/ModuleNotFoundError|No module named/);
    });

    it("sys.exit() は正常終了で、backtrace を stderr に出さない", async () => {
        const outcome = await python.run(ctx, "import sys\nprint(1)\nsys.exit()\nprint(2)\n", "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "1\n",
            stderr: "",
        });
    });

    it("exit() は正常終了で、backtrace を stderr に出さない", async () => {
        const outcome = await python.run(ctx, "print(1)\nexit()\nprint(2)\n", "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "1\n",
            stderr: "",
        });
    });

    it("quit() は正常終了で、backtrace を stderr に出さない", async () => {
        const outcome = await python.run(ctx, "print(1)\nquit()\nprint(2)\n", "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "1\n",
            stderr: "",
        });
    });

    it("sys.stderr への出力があっても sys.exit() は正常終了", async () => {
        const outcome = await python.run(
            ctx,
            `
import sys
print(1)
print("err", file=sys.stderr)
sys.exit()
print(2)
`,
            "",
        );
        expect(outcome).toEqual({
            status: "completed",
            stdout: "1\n",
            stderr: "err\n",
        });
    });

    it("sys.exit(1) は RE になる", async () => {
        const outcome = await python.run(ctx, "print(1)\nimport sys\nsys.exit(1)\n", "");
        expect(outcome).toEqual({
            status: "RE",
            stdout: "1\n",
            stderr: "exit 1",
        });
    });

    it("sys.exit に文字列を渡すと RE になり、メッセージを stderr に出す", async () => {
        const outcome = await python.run(ctx, "print(1)\nimport sys\nsys.exit('boom')\n", "");
        expect(outcome).toEqual({
            status: "RE",
            stdout: "1\n",
            stderr: "boom\n",
        });
    });
});

/** allowlist 各 wheel / パッケージの最小 smoke（pnpm test で確認） */
describe("python allowlist package smoke", () => {
    let ctx: LanguageContext;

    beforeAll(async () => {
        ctx = await python.init();
    }, 60_000);

    const cases: ReadonlyArray<{ name: string; code: string; stdout: string }> = [
        {
            name: "numpy",
            code: `
import numpy as np
print(int(np.array([1, 2, 3]).sum()))
`,
            stdout: "6\n",
        },
        {
            name: "bitarray",
            code: `
from bitarray import bitarray
print(bitarray("101").count())
`,
            stdout: "2\n",
        },
        {
            name: "sympy",
            code: `
from sympy import Symbol, simplify
x = Symbol("x")
print(simplify(x + x))
`,
            stdout: "2*x\n",
        },
        {
            name: "mpmath",
            code: `
from mpmath import mpf
print(int(mpf(2) + mpf(3)))
`,
            stdout: "5\n",
        },
        {
            name: "sortedcontainers",
            code: `
from sortedcontainers import SortedList
print(SortedList([3, 1, 2])[0])
`,
            stdout: "1\n",
        },
        {
            name: "more_itertools",
            code: `
from more_itertools import chunked
print(list(chunked([1, 2, 3, 4], 2)))
`,
            stdout: "[[1, 2], [3, 4]]\n",
        },
        {
            name: "networkx",
            code: `
import networkx as nx
print(nx.Graph([(1, 2)]).number_of_edges())
`,
            stdout: "1\n",
        },
        {
            name: "atcoder",
            code: `
from atcoder.dsu import DSU
d = DSU(3)
d.merge(0, 1)
print(d.same(0, 1))
`,
            stdout: "True\n",
        },
    ];

    for (const { name, code, stdout } of cases) {
        it(`${name} を入れて実行できる`, async () => {
            const outcome = await python.run(ctx, code, "");
            expect(outcome).toEqual({
                status: "completed",
                stdout,
                stderr: "",
            });
        }, 180_000);
    }
});
