// entrypoints/main.content/index.tsx
import { render } from "preact";
import { App } from "./UI/App";
import "./layout.css";

export default defineContentScript({
    matches: ["https://atcoder.jp/contests/*/tasks/*"],
    main(ctx) {
        const ui = createIntegratedUi(ctx, {
            position: "overlay",
            anchor: "body",
            onMount(container) {
                render(<App />, container);
                return () => render(null, container);
            },
            onRemove(unmount) {
                unmount?.();
            },
        });
        ui.mount();
    },
});
