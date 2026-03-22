// ================================================================================================
// Monaco EditorのTypeScript言語サービスが使用するlibファイルを、
// ワーカーのビルドから分割して別アセットとして出力するViteプラグイン
// ================================================================================================
// ----------------------------------------------------------------
// 本体
// ----------------------------------------------------------------

const MONACO_TS_LIB_GLOBAL_KEY = "__AIBP_MONACO_TS_LIB_FILE_MAP__";
const TS_WORKER_FILE_PATTERN = /(^|\/)ts\.worker-[^/]+\.js$/;

type BuildBundleItem = {
    type: string;
};

type BuildPlugin = {
    name: string;
    apply: "build";
    generateBundle(_: unknown, bundle: Record<string, BuildBundleItem>): void;
    transform(
        this: {
            emitFile(file: { type: "asset"; fileName: string; source: string }): void;
        },
        code: string,
        id: string,
    ): string | null;
};

export default function monacoTypescriptLibSplitPlugin(): BuildPlugin {
    let isLibAssetEmitted = false;

    return {
        name: "aibp-monaco-typescript-lib-split",
        apply: "build",
        generateBundle(_: unknown, bundle: Record<string, { type: string }>) {
            for (const fileName of Object.keys(bundle)) {
                if (TS_WORKER_FILE_PATTERN.test(fileName)) {
                    delete bundle[fileName];
                }
            }
        },
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
                this.emitFile({
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
    };
}
