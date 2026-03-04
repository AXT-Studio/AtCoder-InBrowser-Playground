# AIBP Contribution Guide

AIBPの開発に貢献する方法について説明します。

## Contribution Guidelines

### Issueについて

バグの報告や機能追加の要望などは、[Issues](https://github.com/AXT-AyaKoto/AtCoder-InBrowser-Playground/issues)にて受け付けています。

#### バグ報告

バグを発見した場合、以下の情報を含むIssueを作成してください。

- 発生した環境 (OS, ブラウザ, AIBPのバージョンなど)
- 再現手順 (何をすると……)
- 期待される動作 (……が起こってほしいが)
- 実際の動作 (……が起こってしまう)
- スクリーンショットやコンソールログなど、問題の理解に役立つ情報 (任意)

#### 機能追加の要望

新しい機能の提案や既存機能の改善案がある場合、以下の情報を含むIssueを作成してください。

- 機能の概要
- 利用シナリオ (どのような場面で役立つか)
- 具体的な実装案 (任意)

### Pull Requestについて

品質維持の観点から、[リポジトリ](https://github.com/AXT-AyaKoto/AtCoder-InBrowser-Playground)へのPull Requestは、以下の場合を除いて原則Closeします。

- 修正内容が軽微で、かつ有意義な修正であると作者が判断した場合
- 作者と関わりがある人からのPull Requestである場合
- その他、作者が明示的に許可した場合

---

## Extension Development Guide

### Commands

```bash
cd extension
pnpm install # 依存関係のインストール
pnpm build # ビルド(Chrome用)
pnpm build:firefox # ビルド(Firefox用)
pnpm dev # 開発用ビルド(変更を監視して自動ビルド)
pnpm dev:firefox # 開発用ビルド(Firefox用、変更を監視して自動ビルド)
```

### Freq. Develop Steps

#### 対応言語を追加する

AIBPの対応言語を追加するには、以下の手順を行います。

1. `extension/entrypoints/main.content/createUI.ts`の編集
    - `table#table-op-template`に、追加する言語のテンプレ挿入ボタンを追加。
        - buttonのid属性は、`tempate-<言語名略>_<環境名>`の形式にする (例: `template-js_node`)。
    - `select#select-settings-editor-language`に、追加する言語の選択肢を追加。
        - optionのvalue属性は、Monaco Editorの言語識別子と同じにする (例: `javascript`)。
2. `extension/entrypoints/main.content/uiSetups/insertTemplate.ts`の編集
    - 序盤の`import { getTemplate as ... } ...`の部分に、対応する言語のテンプレート取得関数importを追加。
    - 直後の`templateGetters.<言語名略>_<環境名>`に、テンプレート取得関数を登録。
3. `extension/entrypoints/main.content/codeTemplates/`に、追加する言語のテンプレートコードを作成。
    - 既存のテンプレートコードを参考に実装してください。
4. `extension/entrypoints/background/index.ts`の編集
    - 序盤の`import <言語識別子>Worker from "./workers/<言語識別子>?worker";`部分に、対応する言語のWorker importを追加。
    - 直後の`workerConstructors`に、対応する言語のWorkerコンストラクタを登録。
5. `extension/entrypoints/background/workers/`に、追加する言語のWorkerを作成。
    - 既存のWorkerを参考に、以下を満たすように実装してください。
        - Worker起動時、その言語のコードが渡されたらすぐ実行できるよう準備し、それが完了してから`worker-ready`メッセージを送信する。
        - `worker-run`メッセージを受信したとき、その言語のコードを実行し、実行結果を`worker-result`メッセージで返す。エラーが出たら`worker-error`メッセージで返す。
            - ℹ️ TLE時はWorkerの再起動が行われるので、特別なTLE処理は不要。
        - 複数回`worker-run`メッセージを受信した場合でも、正しく動作する。
            - ⚠️ 実行中に新たな`worker-run`が来ることはないと仮定してよいが、実行完了後に再度`worker-run`が来ることはある。
    - 最も単純なWorkerは`plaintext.ts`です。これを参考にするとよいでしょう。

手順完了後、以下を確認してください。

- 正常にビルドが通ること。
- AIBPをブラウザに読み込み、追加した言語でコードを記述・実行できること。
    - [Practice Contest - A](https://atcoder.jp/contests/practice/tasks/practice_1)、[ABC443 - A](https://atcoder.jp/contests/abc443/tasks/abc443_a)などで動作確認を行うとよいでしょう。
- ビルド出力物のうちテキストファイルに、5MB以上の大きなファイルが含まれていないこと (ブラウザ拡張の制限)。

---

## Website Development Guide

### Commands

```bash
cd documents
pnpm install # 依存関係のインストール
pnpm docs:dev # 開発用サーバー起動
pnpm docs:build # 静的サイト生成
pnpm docs:preview # 静的サイトのローカルサーバー起動
```
