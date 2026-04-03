# 1. コードを書く

まずは問題ページを開いてみましょう！
AIBPを導入すると、AtCoderの問題ページに、自動でAIBPのUIが追加されます。

迷った方は[AtCoder Beginners Selection - PracticeA "Welcome to AtCoder"](https://atcoder.jp/contests/abs/tasks/practice_1)の問題ページを開いてみてください。
右側に追加された新しいウィンドウが、AtCoder In-Browser PlaygroundのUIです。

![](/visual.webp)

## 言語設定

AIBPを使うためには、どの言語で書くかを先に設定する必要があります。

- 「Settings」タブを開きます。
- 「Language (IntelliSense, Syntax Highlighting)」のセレクトボックスを開き、あなたが書くプログラミング言語を選択します。

:::tip
「Language (IntelliSense, Syntax Highlighting)」の設定は、ページをリロードしたり、別の問題ページを開いたときにも引き継がれます。
もしあなたが1つの言語しか使わないのであれば、最初に設定したあとはこの設定を再度変更することはないでしょう。
:::

![SettingsタブのUI](/tab_settings.webp)

## テンプレートを使う

一部の言語では、コードのテンプレートが用意されています。

- 「Operation」タブを開きます。
- 「Template」セクションの各ボタンを押すと、対応するテンプレートがコード欄に挿入されます。

![OperationタブのUI](/tab_operation.webp)

:::tip 上書き防止機能
コードが空でない状態でテンプレート挿入ボタンを押すと、上書きされることを理解しているか確認するダイアログが表示されます。
:::
:::warning テンプレートへの準拠
以下のいずれかの言語を使用する場合で、コードテストを使用する場合は、テンプレートコードに従うことを強く推奨します。
- JavaScript
- TypeScript
:::

## コードエディターでコードを書く

画面上部のコードエディターで、普通にコードを書きます。
使い方は概ねVSCodeと同じです。

:::tip JavaScript・TypeScriptにおけるIntelliSense機能
AIBPで使用しているコードエディター(Monaco Editor)は、JavaScript・TypeScriptに対するIntelliSense機能を内蔵しています。
そのため、AIBPでも以下の機能が使用できます。

- 組み込みメソッドなどの説明をツールチップで表示
- 入力途中の内容の自動補完
- 型エラーの確認 (TypeScript限定)
:::
