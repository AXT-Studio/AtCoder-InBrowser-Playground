# AIBP 刷新 — 設計決定ドキュメント

AtCoder In-Browser Playground（AIBP）を全面書き直しするにあたり、旧実装の設計インベントリと所感すり合わせで確定した内容をまとめる。

- **正本:** 本ファイル（`DECISIONS.md`）
- **エージェント向け短い制約:** `AGENTS.md`（本ファイルへのポインタ＋実装中に毎回守るルール）
- **旧コード:** ローカルには残さない前提。必要なら GitHub の履歴を参照する  
  <https://github.com/AXT-Studio/AtCoder-InBrowser-Playground>

決定日の目安: 2026-07（すり合わせセッション）。実装時に覆す場合は本ファイルを更新すること。

---

## 1. 製品境界

### やること

- AtCoder の問題ページ（`https://atcoder.jp/contests/*/tasks/*`）に、ブラウザ完結のコードエディタ＋テスターを差し込む Web 拡張機能
- コード実行はブラウザ内（Web Worker 等）。AtCoder のコードテスト等の外部実行環境に依存しない
- Monaco Editor による編集体験
- 提出は「Prepare Submission」（ページ下部のソース欄へ転記）まで。自動提出はしない
- Chrome / Firefox 両対応（AMO・Chrome Web Store 提出を継続）

### やらないこと（現時点）

- ジャッジと完全同一のランタイム互換の追求
- ドキュメントサイト（旧 VitePress / pnpm workspace の `apps/document`）の継続 — README に寄せる
- Settings 専用 mode（設定項目が少ないため不要）

### 売りとして残す UX

- **1ページ完結:** 問題文とエディタを同一ページで並べる（`#main-container` 半幅化＋右固定パネル）。大枠の AtCoder DOM 侵襲レイアウトは維持。細部の手直しは可

---

## 2. 決定サマリ（早見表）

| 領域           | 決定                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| ビルド         | WXT 継続。pnpm monorepo / ドキュメントサイトは廃止方向                             |
| ブラウザ分岐   | **Chrome = MV3 Offscreen**、**Firefox = MV2 Background**。分岐は必須（落とせない） |
| エディタ       | Monaco 固定。AMO 5MB/file 対策のアセット分割必須。Firefox は Blob Worker           |
| UI             | Preact + Preact Signals。巨大 HTML 文字列 UI は捨てる                              |
| 画面 IA        | **Solve / Compare / Stress** の mode。Settings mode なし                           |
| JS/TS 実行     | QuickJS + esbuild-wasm。stdin 置換・console shim 維持。完全 Node 互換は追わない    |
| ES2024+        | `Object/Map.groupBy`・Set 集合演算・Iterator helpers **のみ**                      |
| Python         | Pyodide。scipy 切断。init 先読み廃止。micropip による動的ロード                    |
| 実行キャッシュ | Pyodide init が十分速くなれば Worker/VM キャッシュは捨てたい                       |
| TLE            | init 除外後のユーザーコード実行時間のみ（ジャッジ忠実）                            |
| テスト         | Vitest（純関数から）＋手動手順整備                                                 |
| 捨てる         | グローバル `Result` 型、旧 Operation/Test/Settings タブ前提                        |

---

## 3. ブラウザ拡張の制約（触らない核）

### 3.1 Chrome MV3 / Firefox MV2

- Chrome MV3 の Service Worker 上では、長寿命 Web Worker + WASM（Pyodide / QuickJS）によるコードテスト実行が実質できない → **Offscreen Document**（WXT では Unlisted Page として出る理解でよい）に実行を寄せる
- Firefox は MV3 対応が弱い前提で **MV2 Background** を使い続ける。Background が Runner Worker のホスト
- したがって **MV2 パスは捨てられない**（「両ブラウザ最新なら MV3 だけ」は誤り）
- 分岐を抽象（Execution Host）の裏に隠すのはよいが、分岐自体は仕様

### 3.2 Monaco + AMO 5MB/file

- TypeScript 言語サービス用 lib だけで数 MB 級になり、単一ファイル制限に抵触しうる
- 型情報は UX 上必要（消さない）→ **ビルド時分割＋実行時に連結して Blob Worker 化** は必須
- 旧実装は Vite プラグインで lib を別アセット化していた。刷新時に Rollup/Rolldown 設定だけで足りるか再検証してよいが、失敗したら同種の分割に戻す
- Firefox では content script から拡張内 Worker を直接 `new` できない → unlisted スクリプトを `fetch` → Blob URL → `Worker`（Monaco の editor/ts worker）

### 3.3 CSP

- `wasm-unsafe-eval` は WASM 実行に必須 → 残す
- CDN `connect-src` は、Pyodide 資産を拡張内に同梱できれば外せる可能性あり（パッケージ方針とセット）

---

## 4. 実行アーキテクチャ

### 4.1 層構造（残す）

```
Content Script（UI・判定表示）
  → runtime.sendMessage
Background（メッセージハブ）
  → Chrome: Offscreen へ転送 / Firefox: 自前で Worker 実行
Runner Worker
  → 言語 Module（init / run）
```

- 打ち切り（TLE）は必須
- 並列は残してよい

### 4.2 キャッシュ（条件付き削除）

- 旧実装が Worker/VM をキャッシュしていた主因は **Pyodide 初期化が数秒かかること**
- QuickJS 初期化は ~0.15s 程度で、毎回生成でも余裕がある
- **目標:** Pyodide の素の init（パッケージ先読みなし）が十分速ければ、キャッシュと idle terminate 状態機械を捨てて単純化する
- キャッシュが再び必要になった場合のみ、失敗/TLE 時 terminate・idle 破棄ポリシーを復活

### 4.3 ready 後 TLE（残す・意味を修正）

- 初期化コストを制限時間に含めないため、実行準備完了（`ready`）後から TLE 計測する考え方は残す
- **Verdict の TLE はジャッジ忠実に:** 壁時計全体ではなく、**init 除外後のユーザーコード実行時間のみ**
- キャッシュ削除と合わせてプロトコルは整理してよい（後付けで歪んでいる可能性あり）

### 4.4 言語 Module API（残す）

- `init()` → コンテキスト
- `run(ctx, code, stdin)` → stdout/stderr または CE/RE
- `plaintext` runner は「言語追加のサンプル」として残す
- `javascript` は typescript runner にマップしてよい

---

## 5. TypeScript / JavaScript 実行

### 5.1 スタック

- QuickJS（WASM）+ esbuild-wasm（TS→ES2023 相当）+ 縮小した polyfill + console shim（object-inspect 系）
- 完全な Node/Deno/Bun 互換は追わない

### 5.2 stdin / console（維持）

- 入力は次のパターンを `__stdin__` に置換して渡す方式でよい
    - `require("fs").readFileSync("/dev/stdin", "utf8")`
    - `await Deno.readTextFile("/dev/stdin")`
    - `await Bun.file("/dev/stdin").text()`
- `console.log` / `console.error` を stdout/stderr に寄せる
- **console shim は必須:** QuickJS から本体へ値を戻す際に JSON シリアライズを通ると `NaN` 等が壊れるため

### 5.3 ES2024+ サポート範囲（決定）

**残す（polyfill 対象にしてよい）:**

- `Object.groupBy` / `Map.groupBy`
- Set の集合演算（union / intersection / difference 等）
- Iterator helpers

**切る:** 上記以外の ES2024/2025/2026 機能  
（AtCoder ジャッジの Node/Deno/Bun バージョンでも未対応寄り、または競プロでの使い所が薄い）

→ core-js 系のビルド時 polyfill はこれに合わせて大幅縮小

---

## 6. Python（Pyodide）

### 6.1 パッケージ allowlist（決定）

| パッケージ        | 扱い                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| sortedcontainers  | サポート                                                                                                        |
| bitarray          | サポート                                                                                                        |
| numpy             | サポート                                                                                                        |
| networkx          | サポート                                                                                                        |
| sympy             | サポート（mpmath は依存として付随）                                                                             |
| more-itertools    | サポート（旧ドキュメントでは不可だったが入れ忘れと判断）                                                        |
| ac-library-python | サポート（Pyodide 配布外 → micropip）                                                                           |
| **scipy**         | **切断**                                                                                                        |
| matplotlib        | **明示サポートしない**。networkx ロードの副作用で付いてきても害は少ないので存在は許容。AtCoder 公式一覧にも無い |

Heuristic / ML / ネイティブバインド寄り（pandas, sklearn, torch, PuLP, z3, shapely, acl-cpp-python, cppyy 等）は引き続き対象外でよい。

### 6.2 ロード方針（決定）

1. **init:** `loadPyodide` のみ。パッケージの一括先読みはしない
2. **run 前:** ユーザーコードから import を自前抽出 → allowlist にあればロード
3. **API は micropip に揃える**（[Pyodide Loading packages](https://pyodide.org/en/stable/usage/loading-packages.html) の推奨に沿う）

概念コード:

```ts
await pyodide.loadPackage("micropip"); // micropip 自体の導入
const micropip = pyodide.pyimport("micropip"); // ロード済みモジュールのハンドル（ダウンロードではない）

// import 名 → micropip.install 引数
const packageArg: Record<string, string> = {
    numpy: "numpy",
    networkx: "networkx",
    sortedcontainers: "sortedcontainers",
    sympy: "sympy",
    bitarray: "bitarray",
    more_itertools: "more-itertools",
    atcoder: "ac-library-python",
};

for (const name of extractImports(code)) {
    const arg = packageArg[name];
    if (arg) await micropip.install(arg);
}
await pyodide.runPythonAsync(code);
```

- `pyodide.pyimport` は「すでに FS に入ったモジュールを JS から掴む」だけ。パッケージ取得には使わない
- wheel の拡張内同梱（CORS 回避）は維持してよい。`install` 引数を URL やローカル相当にするのは実装詳細
- stdlib のみの提出は毎回速く、重いパッケージ利用者だけその run が重い、で公平

### 6.3 その他

- Python 実行エラーをすべて CE に寄せている旧挙動は、刷新時に RE と分離したい（要修正）
- 許容誤差の問題文パースは諦め気味でよい（デフォルト `1e-6` 等）

---

## 7. UI / 画面 IA（決定）

### 7.1 技術

- **Preact + Preact Signals**
- WXT は FW 非依存。公式スターターに Preact テンプレは無い（Vanilla/Vue/React/Svelte/Solid）→ 既存構成に Vite の Preact プラグインを足す。`@preact/compat` はバックアップ
- Monaco は Preact 化しても imperative（ref + mount/dispose）
- 旧「巨大 HTML 文字列 + DOMParser + setupXXX」は捨てる

### 7.2 Mode = やりたいこと（エディタ切替を兼ねる）

別の「エディタタブ」は作らない。**mode タブがどのバッファを編集するかを決める。**

裏データ: **提出用 / 愚直 / 生成器** の 3 バッファ＋**各バッファ独立の言語**。  
永続化: `pathname × バッファ`（コード・言語）。  
制限時間・許容誤差: 問題由来の**共有値**を各 mode のテスト面に表示。

#### Mode: Solve（普通に解く）

- 見えるエディタ: **提出用**
- テンプレ挿入・言語変更・Prepare Submission
- 一致テスト（一部折りたたみ可 → コーディング時はエディタを広く）
    - 折りたたみ時**隠す:** Testcase Input, Expected Output, Actual Stdout/Stderr, Run Test
    - 折りたたみ時**見える:** Example Auto-Exec ボタン群、Test Status（Status, Exec. Time）
    - 実行制限時間・許容誤差の設定

#### Mode: Compare（デバッグ・提出用 vs 愚直）

- 見えるエディタ: **愚直**（提出用バッファは編集せず実行に使う）
- テンプレ挿入・言語変更
- 一致テスト（折りたたみ同様）
    - 折りたたみ時**隠す:** Testcase Input, Solve/Naive の Stdout/Stderr, Run Test
    - 折りたたみ時**見える:** Example Auto-Exec、Test Status  
      （AC / WA / Solve TLE / Naive TLE / Solve RE / Naive RE。Exec. Time は不要）
    - 実行制限時間・許容誤差

#### Mode: Stress（ランダムテスト）

- 見えるエディタ: **生成器**
- 生成器向けテンプレ（提出・愚直とは別）・言語変更
- ランダムテスト（折りたたみ同様）
    - 折りたたみ時**隠す:** Generated Testcase, Solve/Naive Stdout/Stderr
    - 折りたたみ時**見える:** Test Status（AC/WA/Solve TLE/Naive TLE/Gen TLE/Solve RE/Naive RE/Gen RE）、Run Test
    - 最大回数指定して連続 Run できる入力
    - 実行制限時間・許容誤差

#### Settings mode

- **作らない**（制限時間・言語・許容誤差は上記に吸収される）

#### ショートカット

- mode 切替用ショートカットを用意する（具体キーは実装時）

#### トレードオフ（許容）

- Compare 中に提出用を直すには Solve に戻る。mode 分担を優先

### 7.3 テンプレ

- 通常の「入力を配列にするだけ」系は削り、scanner / interactive 中心でも可
- 生成器テンプレは別物として用意
- Python テンプレは未決（わからん）

### 7.4 デザイン言語（UI 見た目の正本）

刷新 UI のビジュアル方針。実装は `entrypoints/main.content/UI/`（`App.css` = パネル枠・mode タブ、`controls.css` = mode 共通コントロール）に寄せる。

#### 全体

- **Soft elevated card:** 右固定パネルは不透明白＋細いボーダー＋外側だけの柔らかい多層シャドウ。角丸 ~12px
- **グラスモーフィズムは使わない**（AtCoder 背面が単色で効きにくい）
- **ニューモーフィズムは使わない**（スクロール端・他要素との距離で破綻しやすい）
- パネル全体は `overflow` でスクロールさせない。スクロールが要るのは子領域だけ
- Integrated UI（Shadow Root 不可）。Monaco 前提。クラスは `aibp-` プレフィックスで Bootstrap と隔離
- 色は **slate 系**（`#0f172a` / `#334155` / `#64748b` / `#e2e8f0` / `#f1f5f9` / `#f8fafc`）。紫グラデ・強いグロー・AtCoder 緑の全面塗りは避ける

#### コンポーネント感

- **Mode 切替:** segmented control（薄いグレーのトラック＋選択中だけ白ピル＋小さな影）。下線タブにしない
- **ラベル:** 11px・semibold・uppercase・muted（`#64748b`）
- **入力:** 高さ 32px・角丸 8px・薄いボーダー。number はスピンボタンで潰れない幅を取る
- **ボタン:** primary = 濃いスレート塗り / accent = 一段薄い塗り / ghost = 白＋ボーダー。ホバーで影を大きく変えない
- **Example 番号:** 小さな chip（正方形に近い）
- **テスト IO:** 2×2 グリッド。monospace。readonly 面は背景を少し落とす。textarea 高さは ~10rem・`resize: none`
- **エディタ枠:** 残り高さを `flex: 1` で取る。仮 textarea → 後で Monaco
- **テストパネル展開時:** パネル本体は mode-view 高さの約 45%（`max-height: 45cqh`）+ 内側 `overflow: auto`（全体スクロールはしない）

#### テストパネルの折りたたみ

- デフォルトは **閉じる**（コーディング時にエディタを広く）
- 折りたたみ時も **DOM は残す**（`hidden` / CSS）。条件レンダリングで unmount しない
- 実行結果・入出力の正本は **Signals（または同等の状態）**。閉じたまま Examples 実行 → 開いたら同じ状態が見える、を保証する
- Status / Exec. Time / TL / eps / Examples は折りたたみ時もバーに残す

#### やってほしくない見た目

- Bootstrap `nav-tabs` の流用
- パネル全体の半透明・大きな単一ドロップシャドウ
- ホバー演出の過多、丸 pill の群れ、絵文字依存の UI

---

## 8. AtCoder 統合・判定

- サンプル・制限時間・ページ文脈の DOM パースは必要。英語ページ等は必要になったら
- 提出の Ace ↔ textarea トグル書き込みは、動いていれば維持（旧 AtCoder Easy Test v2 由来）
- stdout 比較（空白分割＋数値は許容誤差）は必須。空白正規化の詳細仕様は不明なため現状のごまかしを文書化して継続可
- Prepare Submission 時の TS 型エラーブロック等の既存ガードは引き継いでよい

---

## 9. リポジトリ・品質

- **WXT** 継続
- **ドキュメントサイト / pnpm workspace monorepo は廃止方向** → 説明は README へ
- **Vitest** を刷新と同時に導入。最初は純関数のみ  
  （stdout 比較、verdict、DOM パース、Python import 抽出、stdin 置換 等）
- UI / E2E / 実 Worker 実行テストは後段
- **手動テスト手順**も整備する（Chrome 版の不具合を長く見逃した経験あり）
- グローバル `Result<T,E>` 型は捨てる（通常の戻り値型でよい）
- Chrome `dev:` でテスト実行できない問題（旧 Issue #72）は別途調査

---

## 10. 旧実装で意図的に複雑だった箇所（参照用）

GitHub 上の旧コードを読むときの地図。ローカルには無い前提。

| テーマ                | 旧おおよその場所（リポジトリ内パス）                     |
| --------------------- | -------------------------------------------------------- |
| MV3 Offscreen         | `apps/extension/entrypoints/mv3_runner/` , `background/` |
| Runner                | `apps/extension/utils/runners/`                          |
| Monaco 分割プラグイン | `apps/extension/plugins/monacoTypescriptLibSplit.ts`     |
| Pyodide 資産 hook     | `apps/extension/plugins/pyodide-public-assets-hook.ts`   |
| 旧 UI                 | `apps/extension/entrypoints/main.content/UI/`            |
| 比較・判定            | `apps/extension/utils/stdout/`                           |

---

## 11. まだ実装時に決める／軽い未決

- mode 切替ショートカットの具体キー
- Python 提出用テンプレの中身
- 通常テンプレをどこまで削るか
- Pyodide wheel 同梱の最終レイアウトと CSP から CDN を外せるか
- キャッシュ無しで Pyodide init が許容できるかの実測（だめならキャッシュ復活）
- Chrome dev 時の実行ホスト問題の直し方

---

## 12. 所感・議論で効いた一文（コンテキスト）

- Offscreen / MV2 分岐は「安定しづらい」ではなく「それ以外では動かない」
- キャッシュ複雑さの主因は Pyodide 先読み込み。動的ロードで stdlib 提出を速くしたい
- ES2024+ は競プロで使い所があるものだけ残す
- UI FW を入れるなら学習コストは不可避 → 別プロジェクトでも使う Preact に寄せる
- 画面は「やりたいこと」で mode 分割。エディタ切替タブを別に作らない
- テストは入れる。手動手順も整備する
