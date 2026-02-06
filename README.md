# AXT-AyaKoto/AtCoder-InBrowser-Playground

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
    - 対応言語の一覧は後述のセクションを参照してください。

## Installation

### Official Release

- [Chrome Web Store](#) (準備中)
- [Firefox Add-ons](#) (準備中)

### Manual Build and Installation

(あとで書く)

#### Load as Unpacked Extension (Firefox)

- `about:debugging#/runtime/this-firefox`を開きます。
- "一時的なアドオンを読み込む"をクリックします。
