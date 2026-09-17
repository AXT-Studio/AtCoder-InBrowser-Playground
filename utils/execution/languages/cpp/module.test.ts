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

    it("bits/extc++.h と pb_ds ordered_set が使える", async () => {
        const outcome = await runPrepared(
            ctx,
            `#include <bits/extc++.h>
using namespace std;
using namespace __gnu_pbds;
using ordered_set = tree<int, null_type, less<int>, rb_tree_tag, tree_order_statistics_node_update>;
int main() {
    ordered_set s;
    s.insert(3);
    s.insert(1);
    s.insert(2);
    cout << *s.find_by_order(1) << " " << s.order_of_key(3) << endl;
    return 0;
}
`,
            "",
        );
        expect(outcome.status).toBe("completed");
        expect(outcome.stdout).toContain("2 2");
    }, 120_000);

    it("ext/pb_ds の gp_hash_table が使える", async () => {
        const outcome = await runPrepared(
            ctx,
            `#include <ext/pb_ds/assoc_container.hpp>
#include <iostream>
using namespace __gnu_pbds;
int main() {
    gp_hash_table<int, int> mp;
    mp[1] = 2;
    std::cout << mp[1] << std::endl;
    return 0;
}
`,
            "",
        );
        expect(outcome.status).toBe("completed");
        expect(outcome.stdout).toContain("2");
    }, 120_000);

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
