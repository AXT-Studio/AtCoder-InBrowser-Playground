import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureRubyRuntimeCache, rubyDefaultCacheDir } from "../../../../plugins/rubyPublicAssetsHook";
import { ruby, type LanguageContext } from "./module";

describe("ruby language module", () => {
    let ctx: LanguageContext;

    beforeAll(async () => {
        await ensureRubyRuntimeCache(rubyDefaultCacheDir(resolve(".")));
        ctx = await ruby.init();
    }, 180_000);

    it("puts を stdout に出す", async () => {
        const outcome = await ruby.run(ctx, `puts "hello"`, "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "hello\n",
            stderr: "",
        });
    });

    it("gets で stdin を読める", async () => {
        const outcome = await ruby.run(
            ctx,
            `
a, b = gets.split.map(&:to_i)
puts a + b
`,
            "2 3\n",
        );
        expect(outcome).toEqual({
            status: "completed",
            stdout: "5\n",
            stderr: "",
        });
    });

    it("$stderr をキャプチャする", async () => {
        const outcome = await ruby.run(ctx, `$stderr.puts "err"`, "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "",
            stderr: "err\n",
        });
    });

    it("構文エラーは CE になる", async () => {
        const outcome = await ruby.run(ctx, `puts(`, "");
        expect(outcome.status).toBe("CE");
        expect(outcome.stderr).toMatch(/SyntaxError/);
    });

    it("実行時エラーは RE になる", async () => {
        const outcome = await ruby.run(ctx, `raise "boom"`, "");
        expect(outcome.status).toBe("RE");
        expect(outcome.stderr).toMatch(/boom/);
    });

    it("exit は正常終了で、backtrace を stderr に出さない", async () => {
        const outcome = await ruby.run(ctx, `puts 42\nexit`, "");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "42\n",
            stderr: "",
        });
    });

    it("exit 1 は RE になる", async () => {
        const outcome = await ruby.run(ctx, `puts 42\nexit 1`, "");
        expect(outcome.status).toBe("RE");
        expect(outcome.stdout).toBe("42\n");
        expect(outcome.stderr).toMatch(/SystemExit/);
    });

    it("同梱していない C 拡張 gem は LoadError (RE)", async () => {
        const outcome = await ruby.run(ctx, `require "rbtree"`, "");
        expect(outcome.status).toBe("RE");
        expect(outcome.stderr).toMatch(/LoadError|cannot load such file/);
    });

    const gemCases: ReadonlyArray<{ name: string; code: string; stdout: string }> = [
        {
            name: "ac-library-rb",
            code: `
require "ac-library-rb/dsu"
dsu = AcLibraryRb::DSU.new(3)
dsu.merge(0, 1)
puts dsu.same?(0, 1)
`,
            stdout: "true\n",
        },
        {
            name: "bitarray",
            code: `
require "bitarray"
ba = BitArray.new(8)
ba[1] = 1
puts ba[1]
`,
            stdout: "1\n",
        },
        {
            name: "sorted_containers",
            code: `
require "sorted_containers"
a = SortedContainers::SortedArray.new([3, 1, 2])
puts a[0]
`,
            stdout: "1\n",
        },
        {
            name: "rgl",
            code: `
require "rgl/adjacency"
g = RGL::DirectedAdjacencyGraph[1, 2, 2, 3]
puts g.num_edges
`,
            stdout: "2\n",
        },
        {
            name: "faster_prime",
            code: `
require "faster_prime"
puts 7.prime?
`,
            stdout: "true\n",
        },
    ];

    for (const { name, code, stdout } of gemCases) {
        it(`${name} を require して実行できる`, async () => {
            const outcome = await ruby.run(ctx, code, "");
            expect(outcome).toEqual({
                status: "completed",
                stdout,
                stderr: "",
            });
        }, 60_000);
    }
});
