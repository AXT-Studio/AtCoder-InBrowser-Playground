// ================================================================================================
// ES2024+ の厳選 Polyfill を core-js からビルドする Vite Virtual Plugin
// (生成したコードは TypeScript Language Module 内で QuickJS に eval する)
//
// 対象は DECISIONS.md §5.3 / AGENTS.md のとおり:
//   Object.groupBy / Map.groupBy ・ Set 集合演算 ・ Iterator helpers
// それ以外の ES2024+（Promise.withResolvers 等）は入れない
// ================================================================================================

import builder from "core-js-builder";

/** core-js-builder に渡すモジュール（安定エントリの es.*） */
const POLYFILL_MODULES = [
    // Object.groupBy / Map.groupBy (ES2024)
    "es.object.group-by",
    "es.map.group-by",
    // Set 集合演算 (ES2025)
    "es.set.union",
    "es.set.intersection",
    "es.set.difference",
    "es.set.symmetric-difference",
    "es.set.is-subset-of",
    "es.set.is-superset-of",
    "es.set.is-disjoint-from",
    // Iterator helpers (ES2025)
    "es.iterator",
] as const;

export const buildPolyfillCodePlugin = () => {
    const VIRTUAL_ID = "virtual:corejs-polyfill";
    const resolvedVirtualModuleId = `\0${VIRTUAL_ID}`;
    let polyfillCode = "";

    return {
        name: "corejs-polyfill",
        async buildStart() {
            polyfillCode = await builder({
                modules: [...POLYFILL_MODULES],
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
