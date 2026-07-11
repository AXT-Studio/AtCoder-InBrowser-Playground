/**
 * Monaco の IntelliSense 用 ambient 宣言。
 * setup.ts から `?raw` で読み込み、addExtraLib に渡す。
 * 拡張本体の tsconfig からは exclude する（DOM の console 等と衝突させない）。
 */
declare var console: {
    log(...data: unknown[]): void;
    error(...data: unknown[]): void;
};

declare module "fs" {
    export function readFileSync(path: string, encoding: "utf8"): string;
}

declare var require: {
    (moduleName: "fs"): typeof import("fs");
};

declare namespace Deno {
    function readTextFile(path: string): Promise<string>;
}

declare namespace Bun {
    function file(path: string): {
        text(): Promise<string>;
    };
}
