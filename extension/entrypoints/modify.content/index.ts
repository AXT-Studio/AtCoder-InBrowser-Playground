import "./style.css";

export default defineContentScript({
    matches: ["https://atcoder.jp/contests/*/tasks/*"],
    async main(ctx) {
        console.log("Content script 'modify' is running.");
        // ------------------------------------------------------------------------------------------------
        // 問題文要素(#main-div > #main-container)を左に寄せるCSSを追加
        // ------------------------------------------------------------------------------------------------
        const intergated = await createIntegratedUi(ctx, {
            position: "inline",
            anchor: "body",
            onMount(container) {},
        });
        intergated.mount();
    },
});
