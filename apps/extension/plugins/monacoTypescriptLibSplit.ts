// ================================================================================================
// Monaco EditorのTypeScript言語サービスが使用するlibファイルを、
// ワーカーのビルドから分割して別アセットとして出力するViteプラグイン
// ================================================================================================
// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------

const MONACO_TS_LIB_GLOBAL_KEY = "__AIBP_MONACO_TS_LIB_FILE_MAP__";

export default function monacoTypescriptLibSplitPlugin() {
    let isLibAssetEmitted = false;

    return {
        name: "aibp-monaco-typescript-lib-split",
        apply: "build",
        transform(code: string, id: string) {
            const normalizedId = id.replace(/\\/g, "/");
            const isMonacoTsLib = normalizedId.endsWith("/vs/language/typescript/lib/lib.js");
            if (!isMonacoTsLib) {
                return null;
            }

            if (!isLibAssetEmitted) {
                const monacoLibScriptSource = code.replace(
                    /export\s*\{\s*libFileMap\s*\}\s*;?\s*$/m,
                    `self.${MONACO_TS_LIB_GLOBAL_KEY} = libFileMap;`,
                );

                if (!monacoLibScriptSource.includes(`self.${MONACO_TS_LIB_GLOBAL_KEY}`)) {
                    throw new Error(
                        "AIBP: Failed to generate unlisted_monaco-ts-lib.js from Monaco lib.js",
                    );
                }

                // emit separate asset that will be fetched at runtime by the content script
                // (monaco.ts will fetch this asset and prepend it to the worker blob)
                (this as any).emitFile({
                    type: "asset",
                    fileName: "unlisted_monaco-ts-lib.js",
                    source: monacoLibScriptSource,
                });
                isLibAssetEmitted = true;
            }

            return `
const globalScope = typeof self !== "undefined" ? self : globalThis;
const libFileMap = globalScope.${MONACO_TS_LIB_GLOBAL_KEY};
if (!libFileMap) {
    throw new Error("AIBP: unlisted_monaco-ts-lib.js is not loaded before unlisted_monaco-ts.js");
}
export { libFileMap };
`;
        },
    } as any;
}
