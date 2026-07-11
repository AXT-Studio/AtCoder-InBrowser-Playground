# AGENTS.md — AIBP 刷新向けエージェント指針

このリポジトリは **全面書き直し（刷新）** 中である。

## 必読

設計決定の正本は **[`DECISIONS.md`](./DECISIONS.md)**。実装・設計判断の前に読むこと。  
旧実装の詳細が必要なら GitHub 履歴を参照すること（ローカルに旧ツリーが無い前提）:  
<https://github.com/AXT-Studio/AtCoder-InBrowser-Playground>

`DECISIONS.md` と矛盾する「よさそうな改善」は、勝手に採用せず確認すること。

## 製品

- AtCoder 問題ページに差し込む、ブラウザ完結のエディタ＋テスター拡張
- 自動提出はしない（Prepare Submission＝ソース欄への転記まで）
- Chrome + Firefox。AMO / Chrome Web Store 提出を継続
- 1ページ完結レイアウト（問題文｜右パネル）を崩さない

## 硬い制約（守る）

1. **実行ホスト:** Chrome = MV3 Offscreen、Firefox = MV2 Background。この分岐は必須。MV2 パスを消さない
2. **Monaco を使う。** Ace 等への置換をしない。AMO **5MB/file** を超えないようアセット分割（または同等策）を必ず入れる。Firefox では Monaco worker を Blob URL 経由で起動する
3. **UI:** Preact + Preact Signals。巨大 HTML 文字列 UI に戻さない。見た目の正本は `DECISIONS.md` §7.4（デザイン言語）
4. **画面:** mode は **Solve / Compare / Stress** のみ。Settings mode を作らない。mode が編集対象バッファ（提出用 / 愚直 / 生成器）の切替を兼ねる
5. **言語設定**は提出用・愚直・生成器で独立。コード・言語は pathname×バッファで永続化
6. **JS/TS:** QuickJS 系。stdin の `__stdin__` 置換と console shim を維持。完全 Node 互換は追わない
7. **ES2024+ polyfill は** `Object/Map.groupBy`・Set 集合演算・Iterator helpers **のみ**
8. **Python:** Pyodide。**scipy は入れない。** init で全パッケージ先読みしない。run 前に import を見て **micropip.install** で動的ロード。allowlist は `DECISIONS.md` 参照
9. **matplotlib** を公式サポート対象にしない（networkx の副作用で付くのは許容）
10. **TLE** は init 除外後のユーザーコード実行時間で判定する（壁時計全体で誤判定しない）
11. **テスト:** Vitest を入れる。純関数テストを優先。手動テスト手順も残す
12. **ツール:** WXT を使う。ドキュメント用 monorepo / VitePress サイトは復活させない（説明は README）

## やってはいけないこと

- Firefox を MV3 前提にして Background 実行パスを削除する
- Monaco の型情報を捨ててバンドルを痩せる「解決」
- 3 エディタを同時表示するレイアウトを前提にする
- Pyodide で scipy や Heuristic/ML 系ライブラリを allowlist に戻す（明示的な決定変更なしに）
- グローバルな `Result<T,E>` 型を再導入する
- 設計の詳細を本ファイルに複製して肥大化させる（詳細は `DECISIONS.md`）

## 実装時の優先レバー（単純化）

- Pyodide を動的ロードにして init を速くし、**Worker/VM キャッシュを捨てられるなら捨てる**
- console shim は残す。core-js は ES2024+ 決定に合わせて最小限
- キャッシュが再び必要なら、そのとき初めて idle terminate 等を復活

## 未決・実装時に決めてよいこと

`DECISIONS.md` の「まだ実装時に決める／軽い未決」を参照（ショートカット具体キー、Python テンプレ、init 実測など）。
