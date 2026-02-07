export default defineContentScript({
    matches: ["https://atcoder.jp/contests/*/tasks/*"],
    cssInjectionMode: "ui",
    main(ctx) {
        console.log("Content script is running.");
    },
});
