// ================================================================================================
// Python: ユーザーコードからトップレベル import 名を抽出する
// ================================================================================================

const TOP_LEVEL_FROM = /^\s*from\s+([A-Za-z_][\w.]*)\s+import\b/;
const TOP_LEVEL_IMPORT = /^\s*import\s+(.+)$/;

const stripPythonNoise = (code: string): string => {
    // トリプルクォート文字列と行コメントを落として、文字列内の偽 import を減らす
    return code.replace(/('''|""")[\s\S]*?\1/g, "").replace(/#.*$/gm, "");
};

const topLevelName = (modulePath: string): string | null => {
    const top = modulePath.split(".")[0]?.trim();
    if (!top || top === "__future__") {
        return null;
    }
    return top;
};

/**
 * コード中の `import` / `from ... import` からトップレベルパッケージ名を抽出する。
 * 相対 import（`from .x`）は無視する。
 */
export const extractImports = (code: string): string[] => {
    const names = new Set<string>();
    const stripped = stripPythonNoise(code);

    for (const line of stripped.split("\n")) {
        const fromMatch = line.match(TOP_LEVEL_FROM);
        if (fromMatch?.[1]) {
            if (fromMatch[1].startsWith(".")) {
                continue;
            }
            const top = topLevelName(fromMatch[1]);
            if (top) {
                names.add(top);
            }
            continue;
        }

        const importMatch = line.match(TOP_LEVEL_IMPORT);
        if (!importMatch?.[1]) {
            continue;
        }

        for (const part of importMatch[1].split(",")) {
            const modulePath = part
                .trim()
                .split(/\s+as\s+/i)[0]
                ?.trim();
            if (!modulePath || modulePath.startsWith(".")) {
                continue;
            }
            const top = topLevelName(modulePath);
            if (top) {
                names.add(top);
            }
        }
    }

    return [...names].sort();
};
