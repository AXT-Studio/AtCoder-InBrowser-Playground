# AIBP — 設計決定（現行仕様）

AtCoder In-Browser Playground（AIBP）の設計正本。覆す場合はこのファイルを先に更新する。

- **エージェント向け短い制約:** [`AGENTS.md`](./AGENTS.md)
- **ユーザー向け:** [`README.md`](./README.md)

---

## 1. 製品境界

### やること

- AtCoder の問題ページ（`https://atcoder.jp/contests/*/tasks/*`）に、ブラウザ完結のコードエディタ＋テスターを差し込む
- 実行はブラウザ内（Web Worker 等）。AtCoder のコードテスト等の外部実行環境に依存しない
- Monaco Editor
- 提出は **Prepare Submission**（ページ下部のソース欄へ転記）まで。自動提出はしない
- Chrome / Firefox（AMO・Chrome Web Store）

### やらないこと

- ジャッジと完全同一のランタイム互換の追求
- 独立ドキュメントサイト / pnpm workspace monorepo（説明は README）
- Settings 専用 mode

### UX の核

- **1ページ完結:** 問題文とエディタを同一ページで並べる（`#main-container` 半幅化＋右固定パネル）
- パネル表示は `window.innerWidth` **1200px 以上**（未満では出さない）

---

## 2. 早見表

| 領域       | 決定                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ビルド     | WXT                                                                                                                                  |
| 実行ホスト | **Chrome = MV3 Offscreen**、**Firefox = MV2 Background**（分岐必須）                                                                 |
| エディタ   | Monaco。AMO 5MB/file 対策の分割＋ Firefox は Blob Worker                                                                             |
| UI         | Preact + Signals。mode = Solve / Compare / Stress                                                                                    |
| JS/TS      | QuickJS-NG + WAMR interp + Sucrase（型落とし）。stdin 置換・console shim。完全 Node 互換は追わない                                   |
| Python     | Pyodide。init 先読みなし。import 抽出 → micropip。scipy / matplotlib なし。wheel 拡張内同梱                                          |
| Ruby       | ruby.wasm（`ruby+stdlib`）。純 Ruby gem 5+rgl依存を init で FS に載せる。C 拡張 gem なし                                             |
| C++        | WASI Clang（Clang 21.1.0 / libc++ / wasi-sdk 28）。コンパイルは ready 前。例外オフ。pb_ds は同梱。Boost / OpenMP / `import std` なし |
| Lua        | wasmoon 1.16.0（Lua 5.4.5 wasm）。対象ジャッジは Lua 5.4.7 のみ。ライブラリなし                                                      |
| エンジン   | `engine/*/dist` 等は git に置かない。`pnpm run build:engine:*` で生成。dev のたびに自動ビルドはしない                                |
| 実行寿命   | 実行ごとに Worker を起動・終了（キャッシュ無し）。必要になったら再検討                                                               |
| TLE        | `ready` 以降のみ計測。Host がタイマー＆ terminate                                                                                    |
| テスト     | `pnpm test` = type-check / fmt / lint / unit（Vitest）                                                                               |

---

## 3. ブラウザ拡張の制約

### 3.1 Chrome MV3 / Firefox MV2

- Chrome MV3 Service Worker 上では長寿命 Worker + WASM 実行が実質できない → **Offscreen** に寄せる
- Firefox は **MV2 Background** が Runner Worker のホスト。MV2 パスは捨てられない
- 分岐を抽象の裏に隠すのはよいが、分岐自体は仕様

### 3.2 Monaco + AMO 5MB/file

- TS 言語サービス lib は大きい → **ビルド時分割＋実行時連結して Blob Worker**（`plugins/monacoTypescriptLibSplit.ts` 等）
- 型情報を捨ててバンドルを痩せるのは不可
- Firefox content script から拡張内 Worker を直接 `new` できない → unlisted を `fetch` → Blob URL → `Worker`

### 3.3 CSP

- `script-src 'self' 'wasm-unsafe-eval'`。`'unsafe-eval'` / `Function()` は使わない
- `connect-src 'self' ws:`（`ws:` は dev 用。実行時に CDN へ取りに行かない）
- Pyodide / wheel / ruby.wasm / WASI Clang は拡張内同梱

---

## 4. 実行アーキテクチャ

### 4.1 層

```
Content Script（UI・判定表示）
  → runtime.sendMessage
Background（メッセージハブ）
  → Chrome: Offscreen へ転送 / Firefox: 自前で Worker 実行
Runner Worker
  → 言語 Module（init / prepare? / run）
```

### 4.2 ready 後 TLE

- Host が `ready` を受けてから `timeLimitMs` タイマー開始
- Worker は制限時間を知らない。TLE 時は Host が `terminate` し結果を合成
- Verdict の TLE は **ready 以降**のみ（init / prepare を含めない）

### 4.3 言語 Module

- `init()` → コンテキスト
- 任意の `prepare?(ctx, code)` → ready より前。失敗なら `CE` を返し `ready` は出さない
- `run(ctx, code, stdin)` → `completed` / `CE` / `RE`（TLE は Host）
- `javascript` は typescript module にマップ
- `plaintext` は「code をそのまま stdout」
- `brainfuck` は Tritium `-b -e`（8bit wrap、EOF は -1→255）。テンプレなし。Monaco は自前 Monarch（`plaintext` に落とさない）
- その他の言語は §5–9

### 4.4 `CodeTestResult`

AC/WA は含めない（Content が mode ごとに判定）。

```ts
type CodeTestResult = {
    status: "completed" | "TLE" | "RE" | "CE";
    execTime: number; // ms。CE は -1
    stdout: string;
    stderr: string;
};
```

| status      | 意味                                      |
| ----------- | ----------------------------------------- |
| `completed` | 制限内に実行終了（AC ではない）           |
| `CE`        | ready より前の失敗（準備・変換・init 等） |
| `RE`        | ready 以降の失敗                          |
| `TLE`       | ready 後に Host が打ち切り                |

### 4.5 プロトコル（要約）

- フィールド名は `language`（`lang` は使わない）
- Content → `execRequest` → Background → Exec Host
- Host → Worker: `start`（`timeLimitMs` は載せない）
- Worker → Host: `ready` のあと `result`。prepare 失敗時は `ready` なしで `result`（CE）
- Host → Content: `execResponse { codeTestResult }`
- Host は起動直後から `ready` / `result` 両方を受け付ける。TLE 後は Worker を切るので遅延 `result` は届かない
- `execTime`（completed / RE）は ready〜result。並列リクエストは `id` で対応付ける

---

## 5. TypeScript / JavaScript

- QuickJS-NG（自前 WASM。WAMR インタプリタでゲスト `WebAssembly`）+ Sucrase（型落とし・sourcemap。ES はダウンコンパイルしない）+ console shim（object-inspect）
- ピン: QuickJS-NG `v0.16.2`、WAMR `WAMR-2.4.1`。FFI は `quickjs-emscripten-core` 0.32（`QTS_*` cwrap は `engine/quickjs-wamr/ffi.ts`）
- 成果物は `pnpm run build:engine:qjs-wamr` で生成し、リポジトリには置かない
- ゲスト `WebAssembly` は Module / Instance と数値 export まで。WASI・JIT/AOT・ホスト橋渡しはしない
- 前処理順: **Sucrase（`transforms: ["typescript"]`、`disableESTransforms`、sourcemap 付き）→ export 除去 → stdin 置換**
- IIFE では包まない（実行ごとに Worker を破棄するため）
- stdin 置換:
    - `require("fs").readFileSync("/dev/stdin", "utf8")`
    - `await Deno.readTextFile("/dev/stdin")`
    - `await Bun.file("/dev/stdin").text()`
- `console.log` / `console.error` → stdout / stderr。shim 必須（JSON 経由だと `NaN` 等が壊れる）
- RE/CE の stderr は人が読める文字列。行・列は sourcemap でユーザーソース座標へ戻す
- 列は **1-based**。stderr は snippet（`{line} | {source}`）+ caret（半角幅仮定）+ メッセージ
- エラー文言は QuickJS-NG / Sucrase 準拠（Node 互換は追わない）
- TypeScript `namespace` は Sucrase が本体を落とすので非対応（README 制約）
- ES2024+ は QuickJS-NG 側で足りている。core-js polyfill リストは足さない

---

## 6. Python（Pyodide）

### 6.1 allowlist

| import 名          | 扱い                                      |
| ------------------ | ----------------------------------------- |
| `numpy`            | サポート                                  |
| `bitarray`         | サポート                                  |
| `sympy` / `mpmath` | サポート                                  |
| `sortedcontainers` | サポート                                  |
| `more_itertools`   | サポート（micropip 名: `more-itertools`） |
| `networkx`         | サポート（同梱 pure wheel → `emfs:`）     |
| `atcoder`          | サポート（ac-library-python 同梱 wheel）  |
| **scipy**          | **切断**                                  |
| matplotlib         | 入れない                                  |

Heuristic / ML 系（pandas, sklearn, torch 等）は対象外。

### 6.2 ロード

1. **init:** `loadPyodide` のみ（パッケージ一括先読みなし）
2. **run 前:** `extractImports` → allowlist のみ `micropip.install`
3. lock 上のパッケージ名はそのまま。同梱専用 wheel（networkx / atcoder）は JS `fetch` → FS 書き込み → `emfs:`（`moz-extension:` / `chrome-extension:` URL を micropip に渡すと失敗する）
4. ビルド時に `plugins/pyodidePublicAssetsHook.ts` が runtime + allowlist wheel を `assets/pyodide/` へ同梱
5. Syntax / Indentation / TabError → **CE**。`sys.exit()` / `exit()` / `quit()` / `sys.exit(0)`（`SystemExit.code in (None, 0)`）は正常終了。非 0 の `SystemExit` は **RE**（CPython と同様 traceback は出さない。非 int の code は stderr へ書いて終了コード 1）。その他の例外 → **RE**。stderr の有無だけでは RE にしない
6. パッケージロード中の進捗ログはユーザー stdout に混ぜない

---

## 7. Lua（wasmoon）

- 対象ジャッジは **Lua 5.4.7 のみ**。LuaJIT は言語差が大きいので対象外
- 実行は wasmoon 1.16.0（公式 Lua 5.4.5 の Emscripten ビルド）。5.4.5 と 5.4.7 の差はパッチ修正。完全同一は追わない
- 追加ライブラリは入れない（ジャッジも stdlib のみ）
- `print` / `io.write` / `io.stdout` / `io.stderr` を差し替えて stdout/stderr を取る
- stdin は MEMFS の `/aibp-stdin` に書いて `io.input`。`io.read` は Lua 本体の実装
- 構文エラー（load）→ **CE**、実行時エラー → **RE**
- Monaco は組み込み `lua`

---

## 8. Ruby（ruby.wasm）

- 対象ジャッジは **Ruby 3.4.5**。実行は `@ruby/3.4-wasm-wasi` の `ruby+stdlib.wasm`（CRuby 3.4）
- JS glue は `@ruby/wasm-wasi`。フル npm パッケージ `@ruby/3.4-wasm-wasi` は入れない（debug wasm まで膨らむ）
- stdin は WASI FS の `/aibp-stdin` を `$stdin` / `STDIN` に繋ぐ。stdout/stderr は character device でキャプチャ（ファイルだと Ruby がバッファして出ない）
- `SyntaxError` → **CE**。`exit` / `exit 0`（`SystemExit#success?`）は正常終了。その他の例外 → **RE**。stderr の有無だけでは RE にしない
- C 拡張（`.so`）は載らない。`rbwasm` 静的リンクは公式 29MiB バイナリの置換になるので対象外

### 8.1 同梱 gem

init 時に gem の `lib/**/*.rb` を `/gems` に展開し、`gems.json` の `loadPaths` を `/gems/...` として `$LOAD_PATH.unshift`。Python のような import 抽出はしない（全体で数十 KiB）。

| gem                 | 扱い                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `ac-library-rb`     | サポート（ジャッジ 1.2.0。`require "ac-library-rb/dsu"` → `AcLibraryRb::DSU`）               |
| `bitarray`          | サポート（ジャッジ 1.3.1）                                                                   |
| `sorted_containers` | サポート（Python `sortedcontainers` 相当。`sorted_set` ではない）                            |
| `rgl`               | サポート（Python `networkx` 相当）。依存 `pairing_heap` / `stream` も同梱。`rexml` は stdlib |
| `faster_prime`      | サポート                                                                                     |
| **`bit_utils`**     | **後回し**（C 拡張）                                                                         |
| **`rbtree`**        | **後回し**（C 拡張）                                                                         |
| **`sorted_set`**    | **後回し**（C 拡張。`sorted_containers` とは別）                                             |
| Heuristic / ML 系   | 対象外（`lightgbm` / `rumale` / `polars-df` / `torch-rb` 等）                                |
| 稀・ネイティブ系    | 対象外（`numo-narray` / `or-tools` / `z3` 等）                                               |

ビルド時に `plugins/rubyPublicAssetsHook.ts` が wasm + `gems.json` を `assets/ruby/` へ同梱。

---

## 9. C++（WASI Clang）

- 対象ジャッジは **C++23 (Clang 21.1.0)**。実行も **同じ 21.1.0** の自前 wasm（libc++、wasi-sdk 28、target `wasm32-wasip1`）
- UI の言語名は **C++**。内部 id は `cpp`。stdlib は libc++ のまま（GCC の libstdc++ には切り替えない）
- `ext/pb_ds` は GCC 15.2.0 のヘッダを **エンジンビルド時** に取得（`engine/clang-wasi/scripts/fetch-gnu-headers.py` → `dist/gnu-compat/`。git に置かない）。libc++ 向けシムは `utils/execution/languages/cpp/shims/`。`bits/extc++.h` は **slim**（`stdc++.h` + pb_ds）。`rope` / `slist` 等の他 GNU 拡張は入れない
- コンパイル（clang → wasm-ld）は **`prepare`＝ready より前**。失敗は **CE**。`ready` 以降はユーザー wasm の WASI 実行だけ（非 0 終了は **RE**）
- フラグ: `-std=gnu++23 -stdlib=libc++ -O2 -DATCODER -DONLINE_JUDGE -fexperimental-library -fno-exceptions -fno-rtti --target=wasm32-wasip1 --sysroot=/ -resource-dir=/lib/clang/21`
- Emscripten `EXIT_RUNTIME` のため、**clang / lld は prepare ごとに作り直す**。glue JS の `ENVIRONMENT_IS_NODE` は Worker で false になるようパッチする
- `bits/stdc++.h` は libc++ 向け shim を同梱（WASI が `#error` する `csetjmp` / `csignal` は入れない）。`bits/extc++.h` は slim。ac-library 1.6 ヘッダを同梱（`#include <atcoder/dsu>`）
- **同梱しない:** Boost、OR-Tools / LightGBM / Z3 等、`import std` / `std.pcm`、OpenMP / pthread、`-march=native` / LTO、GNU `ext/` の pb_ds 以外（rope / slist 等）
- wasm32 の ABI（ポインタ幅、`long double` が 80bit にならない）は README 制約。完全同一は追わない
- ツールチェインは `pnpm run build:engine:clang`（`engine/clang-wasi/scripts/build.sh`）で wasm 化し、あわせて pb_ds ヘッダを取得する。`plugins/cppPublicAssetsHook.ts` が `engine/clang-wasi/dist` + shim + ACL + pb_ds を `assets/cpp/` へ同梱
- glue JS は Blob URL 経由で `import()` しない（Firefox CSP が `blob:` を弾く）。拡張内 URL を直接 import する
- Chrome / Firefox とも他言語と同じ実行ホスト（Offscreen / Background → Runner Worker）

---

## 10. UI / 画面 IA

### 10.1 技術

- Preact + Preact Signals
- Monaco は imperative（ref + mount/dispose）。**テキストの正本は Monaco**（Signals は onChange で片方向追従。props から setValue しない）
- モデルは pathname 滞在中 `BufferKind` 単位でセッション保持（editor dispose では捨てない）。Undo はモデル、折り/カーソル/選択/スクロールは viewState。ページリロードでは捨てる

### 10.2 Mode = やりたいこと（＝編集バッファ）

裏データ: **提出用 / 比較 / 生成器**＋各バッファ独立の言語。  
コードの永続化は `pathname × バッファ`。言語はバッファ単位で拡張全体共通（ページ非依存）。  
TL / eps は問題由来の共有値。

| Mode    | 編集バッファ | 折りたたみ時に見えるもの                                      |
| ------- | ------------ | ------------------------------------------------------------- |
| Solve   | 提出用       | Examples、Status / Time、TL / eps（Run は折りたたみ内）       |
| Compare | 比較         | Examples、Status、TL / eps（Run は折りたたみ内。Time なし）   |
| Stress  | 生成器       | Status、**Run Test**、TL / eps / Loop（詳細 IO は折りたたみ） |

- Settings mode は作らない
- mode 切替ショートカットは **当面なし**。エディタフォーカス中の Ctrl/Cmd+S の吸収だけ例外（ブラウザのページ保存を止める。明示保存はしない）
- Compare 中に提出用を直すには Solve に戻る（許容）

### 10.3 テンプレ

正本は `utils/templates/index.ts`。

- TS solver: Scanner / Interactive のみ（素の Bun/Deno/Node テンプレは置かない）
- JS solver と Generator（TS/JS）は維持
- Lua solver: Input scanner。Generator は `math.random` の最小
- C++ solver: `bits/stdc++.h` + `iostream` + `main` の最小。generator / rep マクロは後回し
- Python / Ruby / Brainfuck / Text は未導入
- 先頭コメントは role（submission / compare / generator）。Lua は `--`

### 10.4 デザイン言語

実装は `entrypoints/main.content/UI/`（`App.css` / `controls.css`）。

- Soft elevated card（不透明白・細いボーダー・外側の柔らかい影・角丸 ~12px）
- グラスモーフィズム / ニューモーフィズムは使わない
- パネル全体スクロール禁止。子領域だけスクロール
- Integrated UI（Shadow Root 不可）。クラスは `aibp-` プレフィックス
- 色は slate 系。紫グラデ・強いグロー・AtCoder 緑の全面塗りは避ける
- Mode: segmented control
- ラベル（`.aibp-label`）: 11px semibold uppercase muted
- Status 色: AC=緑 / RE・CE=紫 / TLE・WA=黄 / その他=灰（`data-color`）
- テストパネルはデフォルト閉じ。折りたたみは unmount せず `hidden`。状態は Signals

---

## 11. AtCoder 統合・判定

- サンプル・制限時間等の DOM パース
- stdout 比較（空白分割＋数値は許容誤差）: `utils/stdout/isOutputCorrect.ts`
- UI Status は `completed` を出さず AC/WA 等へ落とす（Solve: `judgeSolveVerdict.ts` 等）
- Prepare Submission: 提出用 TS を表示中なら型エラーでブロック。DFS + Bun テンプレの警告確認も維持。Compare / Stress では提出用エディタが unmount されるため型検査はスキップ

---

## 12. リポジトリ・品質

- `pnpm test`（type-check / oxfmt / oxlint / Vitest）。ユニットは純関数＋言語 smoke
- 説明は README。`DECISIONS.md` / `AGENTS.md` は設計用
- グローバル `Result<T,E>` は使わない
- エンジン wasm は git に置かない。WXT の sources.zip は `.gitignore` を見ないので、`wxt.config.ts` の `zip.excludeSources` で `temp/**` とエンジンの取得ソース・成果物を除外する

---

## 13. 未決・後回し

- Python / Ruby 提出用テンプレ
- Chrome `dev:` 時の実行ホスト（README の通り、検証は production build）
- Worker/VM キャッシュの再導入判断（現状の init 速度で足りているか）
- Ruby C 拡張 gem（`bit_utils` / `rbtree` / `sorted_set`）。要望があれば検討
- C++ の rep マクロ付きテンプレ、C++ generator テンプレ
