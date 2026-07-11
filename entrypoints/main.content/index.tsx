import { render } from "preact";
import { App } from "./UI/App";
import "./layout.css";

const MOUNT_DELAY_MS = 800;

const waitForLoadAndDelay = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
            resolve();
            return;
        }
        window.addEventListener("load", () => resolve(), { once: true });
    });
    await new Promise((resolve) => setTimeout(resolve, MOUNT_DELAY_MS));
};

export default defineContentScript({
    matches: ["https://atcoder.jp/contests/*/tasks/*"],
    async main(ctx) {
        await waitForLoadAndDelay();

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
