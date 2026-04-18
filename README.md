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

詳細については[Official Web Document](https://aibp.axtech.dev)をご覧ください。

## Installation

- [Chrome Web Store](https://chromewebstore.google.com/detail/atcoder-in-browser-playgr/peebgngcbbimicflmefcmbobenpfbnok)
- [Firefox Add-ons](https://addons.mozilla.org/ja/firefox/addon/atcoder-in-browser-playground/)

---

## for Developers

### Manual Build and Installation

リポジトリをクローンし、リポジトリルートで以下のコマンドを実行することで各種ビルドができます。

```bash
# Chrome向け開発環境の起動
pnpm --filter atcoder-inbrowser-playground-extension run dev:chrome
# Firefox向け開発環境の起動
pnpm --filter atcoder-inbrowser-playground-extension run dev:firefox
# Chrome, Firefox両方のビルド
pnpm --filter atcoder-inbrowser-playground-extension run build
# Chrome向けビルド
pnpm --filter atcoder-inbrowser-playground-extension run build:chrome
# Firefox向けビルド
pnpm --filter atcoder-inbrowser-playground-extension run build:firefox
# Chrome, Firefox両方のビルド→Zip化
pnpm --filter atcoder-inbrowser-playground-extension run zip
# Chrome向け ビルド→Zip化
pnpm --filter atcoder-inbrowser-playground-extension run zip:chrome
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

### Icon file

`/apps/document/docs/public/icon.svg`にAIBPのアイコンが入っています。

### Firefox 申請

ビルドコマンドを教えなきゃいけないので、以下をコピペする。

```txt
Build command: `pnpm install` -> `pnpm run build:firefox`(or `pnpm run zip:firefox`)
```
