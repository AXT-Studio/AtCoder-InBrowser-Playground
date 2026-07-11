import { describe, it, expect } from "vitest";
import { plaintext } from "./module";

describe("plaintext", () => {
    it("init は null を返す", async () => {
        await expect(plaintext.init()).resolves.toBeNull();
    });

    it("run は code を stdout に出す", async () => {
        const ctx = await plaintext.init();
        const outcome = await plaintext.run(ctx, "hello\n", "stdin-is-ignored");
        expect(outcome).toEqual({
            status: "completed",
            stdout: "hello\n",
            stderr: "",
        });
    });
});
