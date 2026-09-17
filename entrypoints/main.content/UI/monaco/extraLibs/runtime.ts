/**
 * Monaco の IntelliSense 用 ambient 宣言。
 * setup.ts から `?raw` で読み込み、addExtraLib に渡す。
 * 拡張本体の tsconfig からは exclude する（DOM の console 等と衝突させない）。
 *
 * DOM Libは直接入れると補完が肥大化して場合によってはフリーズしちゃうこともあるっぽいので直接入れはしない。
 * 実行環境にあって使いそうなものだけここに直接型だけ書いて足しちゃっています。
 */
declare var console: {
    log(...data: unknown[]): void;
    error(...data: unknown[]): void;
};

declare var process: {
    exit(code?: number): never;
};

declare function atob(data: string): string;
declare function btoa(data: string): string;

declare namespace WebAssembly {
    class Module {
        constructor(bytes: ArrayBuffer | ArrayBufferView);
    }
    class Instance {
        constructor(module: Module);
        readonly exports: {
            readonly [name: string]: (...args: (number | bigint)[]) => number | bigint | void;
        };
    }
}

interface Uint8ArrayConstructor {
    fromBase64(data: string): Uint8Array;
    fromHex(data: string): Uint8Array;
}

interface Uint8Array {
    toBase64(): string;
    toHex(): string;
}

declare var performance: {
    now(): number;
    readonly timeOrigin: number;
};

declare module "fs" {
    export function readFileSync(path: string, encoding: "utf8"): string;
}

declare var require: {
    (moduleName: "fs"): typeof import("fs");
};

declare namespace Deno {
    function readTextFile(path: string): Promise<string>;
    function exit(code?: number): never;
}

declare namespace Bun {
    function file(path: string): {
        text(): Promise<string>;
    };
    function exit(code?: number): never;
}
