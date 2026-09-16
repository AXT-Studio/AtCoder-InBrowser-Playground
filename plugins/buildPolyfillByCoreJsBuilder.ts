// ================================================================================================
// ES2024+ の厳選 Polyfill を core-js からビルドする Vite Virtual Plugin
// (生成したコードは TypeScript Language Module 内で QuickJS に eval する)
//
// QuickJS-NG 0.16.2 は Object/Map.groupBy・Set 集合演算・Iterator helpers を持つ。
// POLYFILL_MODULES は空のままにする。
// ================================================================================================

import builder from "core-js-builder";

/** core-js-builder に渡すモジュール（安定エントリの es.*）。空なら polyfill コードは出さない。 */
const POLYFILL_MODULES: string[] = [
    // 例: "es.object.group-by"
];

export const buildPolyfillCodePlugin = () => {
    const VIRTUAL_ID = "virtual:corejs-polyfill";
    const resolvedVirtualModuleId = `\0${VIRTUAL_ID}`;
    let polyfillCode = "";

    return {
        name: "corejs-polyfill",
        async buildStart() {
            polyfillCode = POLYFILL_MODULES.length === 0 ? "" : await builder({ modules: [...POLYFILL_MODULES] });
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
