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

---

## 2. 早見表

| 領域       | 決定                                                                              |
| ---------- | --------------------------------------------------------------------------------- |
| ビルド     | WXT                                                                               |
| 実行ホスト | **Chrome = MV3 Offscreen**、**Firefox = MV2 Background**（分岐必須）              |
| エディタ   | Monaco。AMO 5MB/file 対策の分割＋ Firefox は Blob Worker                          |
| UI         | Preact + Signals。mode = Solve / Compare / Stress                                 |
| JS/TS      | QuickJS + esbuild-wasm。stdin 置換・console shim。完全 Node 互換は追わない        |
| ES2024+    | `Object/Map.groupBy`・Set 集合演算・Iterator helpers **のみ**                     |
| Python     | Pyodide。init 先読みなし。import 抽出 → micropip。scipy なし。wheel 拡張内同梱    |
| 実行寿命   | 現状は実行ごとに Worker を起動・終了（キャッシュ無し）。必要になったら再検討      |
| TLE        | `ready` 以降のみ計測。Host がタイマー＆ terminate                                 |
| テスト     | Vitest                                                                            |

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

- `wasm-unsafe-eval` 必須
- Pyodide / wheel は拡張内同梱。`connect-src 'self'`（CDN への実行時依存はしない）

---

## 4. 実行アーキテクチャ

### 4.1 層

```
Content Script（UI・判定表示）
  → runtime.sendMessage
Background（メッセージハブ）
  → Chrome: Offscreen へ転送 / Firefox: 自前で Worker 実行
Runner Worker
  → 言語 Module（init / run）
```

### 4.2 ready 後 TLE

- Host が `ready` を受けてから `timeLimitMs` タイマー開始
- Worker は制限時間を知らない。TLE 時は Host が `terminate` し結果を合成
- Verdict の TLE は **ready 以降**のみ（init を含めない）

### 4.3 言語 Module

- `init()` → コンテキスト
- `run(ctx, code, stdin)` → `completed` / `CE` / `RE`（TLE は Host）
- `javascript` は typescript module にマップ
- `plaintext` は「code をそのまま stdout」

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
- Worker → Host: `ready` のあと `result`
- Host → Content: `execResponse { codeTestResult }`
- Host は起動直後から `ready` / `result` 両方を受け付ける。遅延 `result` は無視
- `execTime`（completed / RE）は ready〜result。並列は `id` で識別してよい

---

## 5. TypeScript / JavaScript

- QuickJS（WASM）+ esbuild-wasm（TS→ES2023 相当）+ 最小 polyfill + console shim（object-inspect）
- stdin 置換:
    - `require("fs").readFileSync("/dev/stdin", "utf8")`
    - `await Deno.readTextFile("/dev/stdin")`
    - `await Bun.file("/dev/stdin").text()`
- `console.log` / `console.error` → stdout / stderr。shim 必須（JSON 経由だと `NaN` 等が壊れる）

**ES2024+ で残す:** `Object/Map.groupBy`、Set 集合演算、Iterator helpers。それ以外は切る。

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
| matplotlib         | 明示サポートしない                        |

Heuristic / ML 系（pandas, sklearn, torch 等）は対象外。

### 6.2 ロード

1. **init:** `loadPyodide` のみ（パッケージ一括先読みなし）
2. **run 前:** `extractImports` → allowlist のみ `micropip.install`
3. lock 上のパッケージ名はそのまま。同梱専用 wheel（networkx / atcoder）は JS `fetch` → FS 書き込み → `emfs:`（`moz-extension:` / `chrome-extension:` URL を micropip に渡すと失敗する）
4. ビルド時に `plugins/pyodidePublicAssetsHook.ts` が runtime + allowlist wheel を `assets/pyodide/` へ同梱
5. Syntax / Indentation / TabError → **CE**、その他の実行時エラー → **RE**
6. パッケージロード中の進捗ログはユーザー stdout に混ぜない

---

## 7. UI / 画面 IA

### 7.1 技術

- Preact + Preact Signals
- Monaco は imperative（ref + mount/dispose）。**テキストの正本は Monaco**（Signals は onChange で片方向追従。props から setValue しない）

### 7.2 Mode = やりたいこと（＝編集バッファ）

裏データ: **提出用 / 愚直 / 生成器**＋各バッファ独立の言語。永続化は `pathname × バッファ`。  
TL / eps は問題由来の共有値。

| Mode     | 編集バッファ | 折りたたみ時に見えるもの（要旨）                          |
| -------- | ------------ | --------------------------------------------------------- |
| Solve    | 提出用       | Examples、Status / Exec.Time、TL / eps（Run は隠す）      |
| Compare  | 愚直         | Examples、Status（Run は隠す。Exec.Time 不要）            |
| Stress   | 生成器       | Status、**Run Test**、TL / eps / Loop（詳細 IO は隠す）   |

- Settings mode は作らない
- mode 切替ショートカットは **当面なし**（必要性低）
- Compare 中に提出用を直すには Solve に戻る（許容）

### 7.3 テンプレ

- TS solver: **Scanner / Interactive のみ**（素の Bun/Deno/Node テンプレは削除済み）
- JS solver・Generator 系は維持
- 先頭コメントは role（submission / naive / generator）対応済み
- Python テンプレは未導入（必要になったら）

### 7.4 デザイン言語

実装は `entrypoints/main.content/UI/`（`App.css` / `controls.css`）。

- Soft elevated card（不透明白・細いボーダー・外側の柔らかい影・角丸 ~12px）
- グラスモーフィズム / ニューモーフィズムは使わない
- パネル全体スクロール禁止。子領域だけスクロール
- Integrated UI（Shadow Root 不可）。クラスは `aibp-` プレフィックス
- 色は slate 系。紫グラデ・強いグロー・AtCoder 緑の全面塗りは避ける
- Mode: segmented control。ラベルは 11px semibold uppercase muted
- Status 色: AC=緑 / RE・CE=紫 / TLE・WA=黄 / その他=灰（`data-color`）
- テストパネルはデフォルト閉じ。折りたたみは unmount せず `hidden`。状態は Signals

---

## 8. AtCoder 統合・判定

- サンプル・制限時間等の DOM パース
- stdout 比較（空白分割＋数値は許容誤差）: `utils/stdout/isOutputCorrect.ts`
- UI Status は `completed` を出さず AC/WA 等へ落とす（Solve: `judgeSolveVerdict.ts` 等）
- Prepare Submission の TS 型エラーブロック等のガードは維持

---

## 9. リポジトリ・品質

- Vitest（純関数＋ Python allowlist smoke 等）
- 説明は README。`DECISIONS.md` / `AGENTS.md` は設計用
- グローバル `Result<T,E>` は使わない
- 既知: Chrome `dev:` 時の実行ホスト問題（旧 Issue #72）は未解決のまま残っている可能性あり

---

## 10. 未決・後回し

- Python 提出用テンプレ
- Chrome #72（dev 時実行）の扱い
- Worker/VM キャッシュの再導入判断（現状の init 速度で足りているか）
