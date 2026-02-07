import "./style.css";
import { createUI } from "./createUI";
import { setMonacoStyleSyncer } from "./syncMonacoStyles";

export default defineContentScript({
    matches: ["https://atcoder.jp/contests/*/tasks/*"],
    cssInjectionMode: "ui",
    async main(ctx) {
        console.log("Content script 'main' is running.");
        // ------------------------------------------------------------------------------------------------
        // 右側に拡張機能用UIをShadow Rootで追加する
        // ------------------------------------------------------------------------------------------------
        const shadowRootUi = await createShadowRootUi(ctx, {
            name: "aibp-ui",
            anchor: "#main-div",
            position: "inline",
            onMount: async (container) => {
                // Monaco Editorのスタイル同期用のObserverをセットアップ
                const syncStyles = setMonacoStyleSyncer(container);
                // ロード時にsetTimeoutで少し遅延させてから同期を実行（初回同期漏れ対策）
                setTimeout(() => {
                    syncStyles();
                }, 500);

                const root = await createUI();
                container.append(root);
            },
        });
        shadowRootUi.mount();
    },
});
