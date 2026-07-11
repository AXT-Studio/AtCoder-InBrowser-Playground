// ================================================================================================
// Monaco Editor の TypeScript 言語サービス lib をワーカーから分割して別アセット出力する Vite プラグイン
// (AMO 5MB/file 対策。実行時に unlisted_monaco-ts-lib.js を Blob 先頭へ連結する)
// ================================================================================================

const MONACO_TS_LIB_GLOBAL_KEY = "__AIBP_MONACO_TS_LIB_FILE_MAP__";
const TS_WORKER_FILE_PATTERN = /(^|\/)ts\.worker-[^/]+\.js$/;

type BuildBundleItem = {
    type: string;
};

export default function monacoTypescriptLibSplitPlugin() {
    let isLibAssetEmitted = false;

    return {
        name: "aibp-monaco-typescript-lib-split",
        apply: "build" as const,
        generateBundle(_: unknown, bundle: Record<string, BuildBundleItem>) {
            for (const fileName of Object.keys(bundle)) {
                if (TS_WORKER_FILE_PATTERN.test(fileName)) {
                    delete bundle[fileName];
                }
            }
        },
        transform(
            this: {
                emitFile(file: { type: "asset"; fileName: string; source: string }): void;
            },
            code: string,
            id: string,
        ): string | null {
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
