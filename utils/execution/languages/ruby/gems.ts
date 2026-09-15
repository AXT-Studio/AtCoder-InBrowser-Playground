// ================================================================================================
// Ruby: 同梱 gem（純 Ruby）と ruby.wasm ランタイムのピン
// ================================================================================================

/** npm `@ruby/3.4-wasm-wasi` のバージョン。フルパッケージは入れず wasm だけ取る */
export const RUBY_WASM_NPM_VERSION = "2.10.1";

export const RUBY_CACHE_DIR_NAME = "aibp-ruby-cache";

export const RUBY_PUBLIC_ASSETS_BASE = "assets/ruby";

export const RUBY_WASM_FILE_NAME = "ruby+stdlib.wasm";

export const RUBY_GEMS_JSON_FILE_NAME = "gems.json";

export const RUBY_WASM_URL =
    `https://cdn.jsdelivr.net/npm/@ruby/3.4-wasm-wasi@${RUBY_WASM_NPM_VERSION}/dist/${RUBY_WASM_FILE_NAME}` as const;

export const rubyCacheSubdir = (): string => `${RUBY_CACHE_DIR_NAME}/v${RUBY_WASM_NPM_VERSION}`;

export type RubyGemSpec = {
    name: string;
    version: string;
    /** RubyGems API の sha（.gem の SHA256） */
    sha256: string;
    /** ユーザー向け allowlist に出すか。rgl の runtime 依存は false */
    userFacing: boolean;
    /** gemspec の require_paths。省略時は `["lib"]` */
    requirePaths?: readonly string[];
};

/**
 * ジャッジ Ruby 3.4.5 の gem から、純 Ruby かつ Algorithm 向けのもの。
 * rgl の runtime 依存（pairing_heap / stream）も含める。rexml は ruby+stdlib。
 */
export const RUBY_GEMS: readonly RubyGemSpec[] = [
    {
        name: "pairing_heap",
        version: "3.1.1",
        sha256: "c71a74ecdf9d6accc7545b38075b2f4e8d98b550aabe0f0758a587ee12e93588",
        userFacing: false,
    },
    {
        name: "stream",
        version: "0.5.6",
        sha256: "2733607ce840d60c72eb181714d45f0a7b077ee62fec0a94510a29c39175610f",
        userFacing: false,
    },
    {
        name: "ac-library-rb",
        version: "1.2.0",
        sha256: "8923d7daffaf92e623a2552e10ca0bb401b51790e078a676602fc7d1fbb3d8b3",
        userFacing: true,
        /** ジャッジと同じ `require "ac-library-rb/dsu"`。`lib/` 直下の `require "dsu"` ではない */
        requirePaths: ["lib_lock", "lib_helpers"],
    },
    {
        name: "bitarray",
        version: "1.3.1",
        sha256: "6ec714933c4a6100b31dcb49a68135a0409524a1834c9d614b0bd929e3da0743",
        userFacing: true,
    },
    {
        name: "sorted_containers",
        version: "1.1.0",
        sha256: "9928f6fbaf6d3cc1d0f8116df823d2f4e01ea6506839baa7029233c40039141c",
        userFacing: true,
    },
    {
        name: "rgl",
        version: "0.6.6",
        sha256: "2611d75509bcf31be2955c0a14b063c7a198dabba3e95b6a67c8653bd30c5136",
        userFacing: true,
    },
    {
        name: "faster_prime",
        version: "1.0.2",
        sha256: "78da3a4ae5fad9b685daf1dfc6e7f0e6013c33b84cf69a11bb6357de921d3ad6",
        userFacing: true,
    },
];

export const gemDownloadUrl = (gem: RubyGemSpec): string => `https://rubygems.org/gems/${gem.name}-${gem.version}.gem`;

export const gemRequirePaths = (gem: RubyGemSpec): readonly string[] => gem.requirePaths ?? ["lib"];

/** gems.json の配置を変えたら上げる（キャッシュ無効化） */
export const RUBY_GEMS_LAYOUT = 2;

export const rubyGemsStamp = (): string =>
    `layout${RUBY_GEMS_LAYOUT}:${RUBY_GEMS.map((gem) => `${gem.name}@${gem.version}`).join(",")}`;

export const USER_FACING_RUBY_GEMS: readonly string[] = RUBY_GEMS.filter((gem) => gem.userFacing).map(
    (gem) => gem.name,
);

/** C 拡張のため同梱しない（ジャッジにはある） */
export const DEFERRED_NATIVE_RUBY_GEMS: readonly string[] = ["bit_utils", "rbtree", "sorted_set"];

export type RubyGemsBundle = {
    stamp: string;
    /** `$LOAD_PATH` に載せるパス（`/gems` からの相対） */
    loadPaths: string[];
    files: Record<string, string>;
};
