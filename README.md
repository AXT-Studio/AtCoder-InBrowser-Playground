# AXT-AyaKoto/AtCoder-InBrowser-Playground (AIBP)

AtCoderの問題ページに、ブラウザ上で動作が完結するコードエディター・テスターを追加するWeb拡張機能です。

## License

- copyright (c) 2026- Ayasaka-Koto.
- This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Features

1. 外部環境に依存しない、ブラウザ完結のコードテスト
    - コードの実行はブラウザ内(Web Worker)で行われます。
    - AtCoderのコードテストなどの外部環境に依存しません。
2. Monaco Editorによる高度なコード編集機能
    - Visual Studio Codeで使用されているMonaco Editorを組み込んでいます。
    - 一部言語では、Syntax HighlightやIntelliSenseなどの高度なコード編集機能を利用できます。
3. クリップボードへのコードコピーと提出準備
    - 編集したコードを問題ページ下部のソースコード入力欄に自動入力することができます。
4. 複数言語への対応
    - 複数のプログラミング言語に対応しています。
    - 対応言語の一覧は後述の[Supported Languages](#supported-languages)セクションを参照してください。

## Installation

- [Chrome Web Store](https://chromewebstore.google.com/detail/atcoder-in-browser-playgr/peebgngcbbimicflmefcmbobenpfbnok)
- [Firefox Add-ons](https://addons.mozilla.org/ja/firefox/addon/atcoder-in-browser-playground/)

## Supported Languages

AIBPが対応しているプログラミング言語・ジャッジ環境は以下のとおりです。

### Plain Text

- AtCoder上の言語選択
    - Text (cat 9.4)

### JavaScript

- AtCoder上の言語選択
    - JavaScript (Node.js 22.19.0)
    - JavaScript (Deno 2.4.5)
    - JavaScript (Bun 1.2.21)
- 注意点
    - "Run Test"機能でES2024以降の一部構文が使えない可能性があります

### TypeScript

- AtCoder上の言語選択
    - TypeScript 5.9 (tsc 5.9.2 (Node.js 22.19.0))
    - TypeScript 5.8 (Deno 2.4.5)
    - TypeScript 5.9 (tsc 5.9.2 (Bun 1.2.21))
- 注意点
    - "Run Test"機能でES2024以降の一部構文が使えない可能性があります
    - "Run Test"機能では、TypeScriptの型エラーは無視されます
        - 型エラーの確認はエディター画面上で行ってください

---

## for Developers

### Manual Build and Installation

リポジトリをクローンし、リポジトリルートで以下のコマンドを実行することで各種ビルドができます。

```bash
# Chrome向け開発環境の起動
pnpm --filter atcoder-inbrowser-playground-extension run dev
# Firefox向け開発環境の起動
pnpm --filter atcoder-inbrowser-playground-extension run dev:firefox
# Chrome向けビルド
pnpm --filter atcoder-inbrowser-playground-extension run build
# Firefox向けビルド
pnpm --filter atcoder-inbrowser-playground-extension run build:firefox
# Chrome向け ビルド→Zip化
pnpm --filter atcoder-inbrowser-playground-extension run zip
# Firefox向け ビルド→Zip化
pnpm --filter atcoder-inbrowser-playground-extension run zip:firefox
```

拡張機能のバージョンは`wxt.config.ts`の`version`フィールドで管理されます。

### Load as Unpacked Extension (Firefox)

- `about:debugging#/runtime/this-firefox`を開きます。
- "一時的なアドオンを読み込む"をクリックします。

### Document Website

```bash
# ドキュメントサイトの開発環境の起動
pnpm --filter atcoder-inbrowser-playground-document run docs:dev
# ドキュメントサイトのビルド
pnpm --filter atcoder-inbrowser-playground-document run docs:build
# ドキュメントサイトのビルド成果物をローカルサーバーで確認
pnpm --filter atcoder-inbrowser-playground-document run docs:preview
```

### Format, Lint

```bash
# コードのフォーマット
pnpm biome check --write
```
