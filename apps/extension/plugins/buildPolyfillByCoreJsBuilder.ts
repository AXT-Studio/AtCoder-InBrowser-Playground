// ================================================================================================
// ES2024, 2025のPolyfillをcore-jsからビルドするViteのVirtual Plugin
// (生成したPolyfillコードはTypeScript Runner Worker内でQuickJSに渡す)
// ================================================================================================
// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import builder from "core-js-builder";

// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------

export const buildPolyfillCodePlugin = () => {
    const VIRTUAL_ID = "virtual:corejs-polyfill";
    const resolvedVirtualModuleId = `\0${VIRTUAL_ID}`;
    let polyfillCode = "";

    return {
        name: "corejs-polyfill",
        async buildStart() {
            polyfillCode = await builder({
                // QuickJS(ES2023まで)になくて現在のAtCoderジャッジ3環境にあるものを
                // Polyfillするように頑張ってモジュールを書く
                modules: [
                    "core-js/proposals/well-formed-unicode-strings", // Well-Formed Unicode Strings (ES2024)
                    "core-js/proposals/array-grouping-v2", // Array Grouping (ES2024)
                    "core-js/proposals/promise-with-resolvers", // Promise.withResolvers (ES2024)
                    "core-js/proposals/array-buffer-transfer", // ArrayBuffer Transfer (ES2024)
                    "core-js/proposals/set-methods-v2", // New Set Methods (ES2025)
                    "core-js/proposals/iterator-helpers-stage-3-2", // Sync Iterator Helpers (ES2025)
                    // "core-js/proposals/promise-try", // Promise.try (ES2025) (※Node.js環境が非対応)
                    // "core-js/proposals/float16", // Float16 on TypedArrays, DataView, Math.f16round (ES2025) (※Node.js環境が非対応)
                    // "core-js/proposals/regexp-escaping", // RegExp.escape (ES2025) (※Node.js環境が非対応)
                    "core-js/proposals/array-from-async-stage-2", // Array.fromAsync (ES2025?)
                ],
            });
        },
        resolveId(id: string) {
            if (id === VIRTUAL_ID) return resolvedVirtualModuleId;
        },
        load(id: string) {
            if (id === resolvedVirtualModuleId) {
                return `export default ${JSON.stringify(polyfillCode)}`;
            }
        },
    };
};
