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
4. **画面:** mode は **Solve / Compare / Stress** のみ。Settings mode を作らない。mode が編集対象バッファ（提出用 / 愚直 / 生成器）の切替を兼ねる
5. **言語設定**は提出用・愚直・生成器で独立。コード・言語は pathname×バッファで永続化
6. **JS/TS:** QuickJS 系。stdin の `__stdin__` 置換と console shim を維持。完全 Node 互換は追わない
7. **ES2024+ polyfill は** `Object/Map.groupBy`・Set 集合演算・Iterator helpers **のみ**
8. **Python:** Pyodide。**scipy は入れない。** init は `loadPyodide` のみ。run 前に import 抽出 → allowlist のみ **micropip**。wheel は拡張内同梱（`extension://` URL 直インストール不可 → fetch + `emfs:`）
9. **matplotlib** を公式サポート対象にしない
10. **TLE** は init 除外後（`ready` 以降）のユーザーコード実行時間で判定する
11. **テスト:** Vitest。純関数を優先。言語ランナーの smoke も可
12. **ツール:** WXT。ドキュメント用 monorepo / VitePress サイトは復活させない

## やってはいけないこと

- Firefox を MV3 前提にして Background 実行パスを削除する
- Monaco の型情報を捨ててバンドルを痩せる「解決」
- 3 エディタを同時表示するレイアウトを前提にする
- Pyodide で scipy や Heuristic/ML 系を allowlist に戻す（明示的な決定変更なしに）
- グローバルな `Result<T,E>` 型を再導入する
- 設計の詳細を本ファイルに複製して肥大化させる（詳細は `DECISIONS.md`）
