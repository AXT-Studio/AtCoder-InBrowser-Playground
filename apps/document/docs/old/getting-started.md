# AIBPの始め方

## インストール

AtCoder In-Browser Playgroundは、ChromeとFirefoxの両方で利用可能なブラウザ拡張機能です。
Chrome Web StoreとFirefox Add-onsからインストールできます。

- [Chrome Web Store](https://chromewebstore.google.com/detail/atcoder-in-browser-playgr/peebgngcbbimicflmefcmbobenpfbnok)
- [Firefox Add-ons](https://addons.mozilla.org/ja/firefox/addon/atcoder-in-browser-playground/)

## 使い方

拡張機能の[インストール](./../intro/installation.md)が完了したら、適当なAtCoderの問題ページを開いてみましょう！
迷った方は[AtCoder Beginners Selection - PracticeA "Welcome to AtCoder"](https://atcoder.jp/contests/abs/tasks/practice_1)の問題ページを開いてみてください。
すると、問題文がページの左側に寄り、右側に新たなウィンドウが表示されるはずです。
この新しいウィンドウが、AtCoder In-Browser Playgroundです。

![](/visual.webp)

### 基本の使い方

- 「Settings」タブで、使用する言語を選択します。
    - AIBPは複数の言語に対応しています。対応言語については[こちら](./supported-languages/index.md)をご覧ください。
    - ここで選択した言語は、コードエディターのシンタックスハイライトや、コードテストの実行環境に反映されます。
- 上部のコードエディターでコードを書きます。
- 「Test」タブにある「Run Test」ボタンを押すと、コードがブラウザ内で実行され、入力したテストケースに対する出力が下に表示されます。
- 「Operations」タブにある「Prepare Submission」ボタンを押すと、コードが提出用のテキストエリアに自動でコピーされます。
    - その後、提出用のテキストエリアにある「提出」ボタンを押すと、コードが提出されます。

## 機能詳細

### コードエディターエリア (画面上部)

コードエディターエリアは、Monaco Editorを使用したコード編集スペースです。
ここでは、コードの編集や、コードに対するエラーの表示などが行われます。

使い方は概ねVSCodeと同じです。

### 操作タブ(画面下部)

AIBPのUIの下部には3つのタブがあります。
左から順に、**Operations** タブ、**Test** タブ、**Settings** タブです。

#### Operationタブ (左)

![OperationタブのUI](/tab_operation.webp)

- **Template** ボタン
    - ボタンを押下すると、対応する言語のコードテンプレートがコードエディターに挿入されます。
    - ただし、すでにコードエディターにコードがある場合、一度確認画面が表示されます。
- **Prepare Submission** ボタン
    - 現在コードエディターに書いてあるコードを、問題ページ下部のソースコード入力欄に自動でコピーします。
    - また、ソースコード入力欄がある位置まで自動画面をでスクロールします。

#### Testタブ (中央)

![TestタブのUI](/tab_test.webp)

- **Testcase Input** 欄
    - ここにテストケースの入力を記入します。
- **Expected Output** 欄
    - ここに、Testcase Inputに対して期待される出力を記入します。
- **Run Test** ボタン
    - ここまでに記入したTestcase Inputをコードエディターで書いたコードに入力として与えてコードを実行し、出力をExpected Outputと比較します。
- **Status** 欄
    - Run Testの結果が表示されます。
    - AC, WA, TLE, REなどのステータスが表示されます。
- **Exec. Time** 欄
    - コードの実行にかかった時間が表示されます。
- **Example Auto-Exec.** ボタン群
    - 問題文から入出力例を自動抽出できた場合のみ表示されます。
    - Testcase InputとExpected Outputに当該入欲例をコピーし、自動でテストを実行します。
- **Actual Stdout** 欄
    - コードの実行によって実際に出力された標準出力が表示されます。
- **Actual Stderr** 欄
    - コードの実行によって実際に出力された標準エラーが表示されます。

#### Settingsタブ (右)

![SettingsタブのUI](/tab_settings.webp)

以下に、すべての設定項目を列挙します。

- Test
    - Test Time Limit (ms)
        - コードテストの実行時間制限を、ミリ秒単位で設定します。
        - 問題ページを開いたときとリロードしたときに、問題文中の制限時間を自動で抽出して初期値に設定します。
        - 問題文からの制限時間の抽出に失敗した場合、初期値は`2000`msになります。
    - Allowable Error
        - コードテストの出力の比較において、数値の誤差をどの程度許容するかを設定します。
        - デフォルト値は`1e-6`(10の-6乗)です。
        - "浮動小数点数の誤差"というトピックを知らない人は、とくにいじる必要はないでしょう。
- Editor (Need Reload)
    - Language (IntelliSense, Syntax Highlighting)
        - エディターで記述するコードの言語を選択します。
        - ここで選択した言語は、コードエディターのSyntax Highlightingや、コードテストの実行環境に反映されます。
        - ここで言語を変更した場合、変更を完全に反映させるためには、ブラウザのリロードが必要です。

