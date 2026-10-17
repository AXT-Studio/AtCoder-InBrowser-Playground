# AGENTS.md — AIBP エージェント指針

実装・設計判断の前に **[`DECISIONS.md`](./DECISIONS.md)** を読むこと。  
ユーザー向け説明は **[`README.md`](./README.md)**。  
`DECISIONS.md` と矛盾する変更は、勝手に採用せず確認すること。

## 製品

- AtCoder 問題ページに差し込む、ブラウザ完結のエディタ＋テスター拡張
- 自動提出はしない（Prepare Submission＝ソース欄への転記まで）
- Chrome + Firefox（AMO / Chrome Web Store）
- 1ページ完結レイアウト（問題文｜右パネル）を崩さない

## 硬い制約（守る）

1. **実行ホスト:** Chrome = MV3 Offscreen、Firefox = MV2 Background。MV2 パスを消さない
2. **Monaco を使う。** Ace 等へ置換しない。AMO **5MB/file** 対策のアセット分割を維持。Firefox は Monaco worker を Blob URL 経由で起動
3. **UI:** Preact + Preact Signals。巨大 HTML 文字列 UI に戻さない。見た目の正本は `DECISIONS.md` のデザイン言語
4. **画面:** mode は **Solve / Compare / Stress** のみ。Settings mode を作らない。mode が編集対象バッファ（提出用 / 比較 / 生成器）の切替を兼ねる
5. **言語設定**は提出用・比較・生成器で独立。コードは pathname×バッファ、言語はバッファ単位（ページ非依存）で永続化
6. **JS/TS:** QuickJS 系。stdin（fs / Deno / Bun の 3 パターン）を `__stdin__` に置換し、console shim / exit shim を維持。完全 Node 互換は追わない
7. **Python:** Pyodide。**scipy / matplotlib は入れない。** Heuristic/ML 系も allowlist に戻さない。wheel は拡張内同梱
8. **TLE** は init 除外後（`ready` 以降）のユーザーコード実行時間で判定する
9. **テスト:** `pnpm test`（type-check / fmt / lint / unit）。ユニットは Vitest。純関数を優先。言語ランナーの smoke も可
10. **ツール:** WXT。ドキュメント用 monorepo / VitePress サイトは復活させない
11. **Ruby:** ruby.wasm（`ruby+stdlib`）。C 拡張 gem は載せない。同梱は純 Ruby 5 gem + rgl の runtime 依存のみ
12. **C++:** WASI Clang（Clang 21.1.0 / libc++ / wasi-sdk 28）。コンパイルは ready 前。例外オフ。言語セレクト名は C++。pb_ds は slim `bits/extc++.h`（ヘッダはエンジンビルドで取得、git に置かない）。Boost・OpenMP・`import std` は載せない。成果物は `engine/clang-wasi/dist`（`pnpm run build:engine:clang`）

## やってはいけないこと

- グローバルな `Result<T,E>` 型を再導入する
- 設計の詳細を本ファイルに複製して肥大化させる（詳細は `DECISIONS.md`）
