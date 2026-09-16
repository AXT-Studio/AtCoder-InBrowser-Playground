import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { cppDefaultCacheDir, ensureCppRuntimeCache } from "../../../../plugins/cppPublicAssetsHook";
import { CPP_INCLUDE_BUNDLE_MAX_BYTES } from "./assets";
import { cpp, type LanguageContext } from "./module";

const runPrepared = async (ctx: LanguageContext, code: string, stdin: string) => {
    const prepared = await cpp.prepare?.(ctx, code);
    if (prepared) {
        return prepared;
    }
    return cpp.run(ctx, code, stdin);
};

describe("cpp language module", { timeout: 180_000 }, () => {
    let ctx: LanguageContext;

    beforeAll(async () => {
        const cache = await ensureCppRuntimeCache(cppDefaultCacheDir(resolve(".")));
        const includeJson = await stat(cache.includeJsonPath);
        expect(includeJson.size).toBeLessThanOrEqual(CPP_INCLUDE_BUNDLE_MAX_BYTES);
        ctx = await cpp.init();
    }, 180_000);

    it("cout を stdout に出す", async () => {
        const outcome = await runPrepared(
            ctx,
            `#include <iostream>
int main() {
            std::cout << "hello-clang21" << std::endl;
    return 0;
}
`,
            "",
        );
        expect(outcome.status).toBe("completed");
        expect(outcome.stdout).toContain("hello-clang21");
    }, 120_000);

    it("cin で stdin を読める", async () => {
        const outcome = await runPrepared(
            ctx,
            `#include <iostream>
int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << a + b << std::endl;
    return 0;
}
`,
            "2 3\n",
        );
        expect(outcome.status).toBe("completed");
        expect(outcome.stdout).toContain("5");
    }, 120_000);

    it("bits/stdc++.h が使える", async () => {
        const outcome = await runPrepared(
            ctx,
            `#include <bits/stdc++.h>
using namespace std;
int main() {
    vector<int> xs{1, 2, 3};
    cout << accumulate(xs.begin(), xs.end(), 0) << endl;
    return 0;
}
`,
            "",
        );
        expect(outcome.status).toBe("completed");
        expect(outcome.stdout).toContain("6");
    }, 120_000);

    it("コンパイルエラーは CE になる", async () => {
        const outcome = await runPrepared(ctx, `int main() { return this_symbol_does_not_exist; }`, "");
        expect(outcome.status).toBe("CE");
        expect(outcome.stderr).toMatch(/undeclared identifier|error:/i);
    }, 30_000);

    it("ac-library の dsu が使える", async () => {
        const outcome = await runPrepared(
            ctx,
            `#include <iostream>
#include <atcoder/dsu>
int main() {
    atcoder::dsu uf(3);
    uf.merge(0, 1);
    std::cout << uf.same(0, 1) << std::endl;
    return 0;
}
`,
            "",
        );
        expect(outcome.status).toBe("completed");
        expect(outcome.stdout).toContain("1");
    }, 120_000);
});
