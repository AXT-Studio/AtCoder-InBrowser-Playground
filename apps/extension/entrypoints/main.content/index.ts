import "./style.css";

import { createUI } from "./UI/module";

// ----------------------------------------------------------------
// load完了して0.8秒程度待ってからUIを生成して挿入するための待機処理
// ----------------------------------------------------------------
const waitForLoadAndDelay = async () => {
    await new Promise<void>((resolve) => {
        console.log(`document.readyState: ${document.readyState}`);
        if (document.readyState === "loading") {
            document.addEventListener("load", () => resolve());
        } else {
            resolve();
        }
    });
    await new Promise((resolve) => setTimeout(resolve, 800));
};

// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------
export default defineContentScript({
    matches: ["https://atcoder.jp/contests/*/tasks/*"],
    async main(ctx) {
        console.log("Content script 'main' is running.");
        console.log("waiting for load event...");
        await waitForLoadAndDelay();
        console.log("load event received.");
        // UIを生成して挿入する
        const integratedUi = createIntegratedUi(ctx, {
            position: "inline",
            anchor: "body",
            onMount: async (container) => {
                const root = await createUI();
                container.append(root);
            },
        });
        integratedUi.mount();
    },
});
