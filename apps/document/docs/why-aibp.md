# AIBPを選ぶ理由

AtCoder In-Browser Playground (AIBP)は、AtCoderの問題ページ上で動作する、ブラウザ完結のコードエディター・テスターを提供するWeb拡張機能です。
AIBPは、拡張機能を入れるだけで利用可能で、AtCoderのコードテスト画面より機能が充実しているため、快適な競技プログラミング環境をより手軽に実現します。

## 誕生の背景

AIBPを公開する前、AtCoderのコンテストに参加する場合、主に以下2つの方法のどちらかでコードを書くことが一般的でした。

- **AtCoderのコードテスト機能を利用する**
    - AtCoderの各コンテストには「コードテスト」ページが用意されています。
    - このページにはAce Editorが組み込まれており、ブラウザ上でコードを編集・テストできます。
    - しかし、Ace EditorはVisual Studio Codeなどと比べると機能が限定されており、コード編集環境として快適であると感じない人も少なくありません。
- **環境構築を行い、ローカルのコードエディターを使用する**
    - [online-judge-tools](https://github.com/online-judge-tools/oj)などのツールをセットアップし、ローカルのコードエディターでコードを書き、コマンドラインでテストを行う方法もあります。
    - この方法は、使用するエディタを自由に制限できる、慣れれば提出までをスムーズに行えるなどの利点があります。
    - しかし、環境構築には手間がかかり、特に初心者にとってはハードルが高いことが多いです。

これら2つの方法の「間」を埋めることを目的として作られたのが、**AtCoder In-Browser Playground**です。

## 特徴

AIBPは、コードエディタとテスターを提供する拡張機能です。AIBPをあなたが使っているブラウザにインストールするだけで、AtCoderの問題ページを問題確認から提出までをより快適に行う環境に変えることができます。

特筆すべき点は以下の通りです。

- **Monaco Editorの搭載**
    - VSCodeで使用されているMonaco Editorを組み込んでいます。
    - とくにVSCodeに慣れている人にとっては、使い慣れたコード編集環境によく似た体験が得られます。
- **ブラウザ完結のコードテスト**
    - コードの実行はブラウザ内(Web Worker)で行われます。
    - これにより、コードテストの実行を待つ必要がなくなります。あなたが「Run Test」ボタンを押したら、即座にテストが開始されます。
- **提出準備のサポート**
    - 編集したコードを問題ページ下部のソースコード入力欄に自動入力するボタンがあります。
    - たった3クリックするだけで、編集したコードを提出することができます。
- **複数言語への対応**
    - AIBPは、複数のプログラミング言語に対応しています。
    - 対応言語の詳細については、[こちら](./supported-languages/index.md)をご覧ください。

## JavaScript・TypeScriptへの対応

AIBPは、JavaScript・TypeScriptを第一級市民としてサポートしています。
これにはいくつかの理由があります。

1. **AtCoder-JavaScript-Testerの後継だから**
    - AIBPは、[UserScript 『AtCoder-JavaScript-Tester』](https://github.com/AXT-AyaKoto/AtCoder-JavaScript-Tester)の後継として開発されました。
    - AtCoder-JavaScript-Testerを、より使いやすく、より多機能にしたいという思いから生まれたのがAIBPです。
      それゆえに、AIBPはJavaScript・TypeScriptのサポートを重視しています。
2. **JavaScript・TypeScriptは易しい言語だから**
    - JavaScriptは、数あるプログラミング言語の中でも、「とっつきやすい」言語の一つといえます。
        - ブラウザ上で簡単に実行でき、環境構築で挫折するリスクが低いです。
        - 文法も比較的シンプルで、初心者にとって優しい言語です。
        - 学習リソースが豊富で、インターネット上でも多くの情報が得られます。
            - とくに、[MDN Web Docs](https://developer.mozilla.org/ja/)というWeb技術の統一文書が日本語で提供されていることは、学習の大きな助けになるでしょう。
        - JavaScriptからTypeScriptへの移行もハードルは高くなく、TypeScriptも比較的とっつきやすいといえます。
    - AIBPの公開時点ではAtCoderのJavaScript・TypeScriptの利用者はまだ少ないものの、すでにJavaScript・TypeScriptを学習している人や、これからプログラミングを学ぶ人にとって、AtCoderを始める際の選択肢の一つとして、JavaScript・TypeScriptがより身近なものになることを願っています。

AIBPは、JavaScript・TypeScriptに対して、AIBPが対応する全言語に共通の機能に加えて、以下のような特別な機能も提供しています。

- IntelliSense
    - コード補完や関数のシグネチャの表示など、Monaco EditorのIntelliSense機能が利用できます。
- 型エラーの表示
    - TypeScriptの型エラーがエディター上に表示されます。
    - ただし、"Run Test"機能では型エラーは無視されるため、型エラーの確認はエディター画面上で行ってください。
- 特殊な注意点に関する警告
    - RE(Runtime Error)となる可能性の高いコードを提出しようとしたときに、警告を表示します。
