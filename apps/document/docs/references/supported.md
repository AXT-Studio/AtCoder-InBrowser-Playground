# 推奨環境・対応環境

このページでは、AIBPの動作推奨環境と、AIBPの各機能が対応する言語・環境についての情報をまとめています。

## 推奨環境

AIBPの動作に必要なブラウザ環境は、以下のとおりです。

### サポート対象

AIBPは、その最新版が、以下に挙げるブラウザの最新版で動作することを保証します。

- [Firefox](https://www.firefox.com/ja/)
- [Google Chrome](https://www.google.com/intl/ja_jp/chrome/)

:::warning
これらのブラウザの過去のバージョンや、他のブラウザで動作するかは保証されないことに注意してください。
例えば「最新のChromeで動かない」という報告には対応しますが、「最新のEdgeで動かない」という報告には原則対応しません。
:::

:::tip
AIBPの開発者は、現在[Floorp](https://ja.floorp.app/ja-JP)をブラウザとして常用しています。
このため、Floorp限定で発生する不具合については例外的に修正される可能性が高いです。
:::

### 動作が期待されるブラウザ

AIBPは、以下のいずれかを満たすブラウザで動作することが期待されます。

- Firefoxをベースとしたブラウザ (例: [Floorp](https://ja.floorp.app/ja-JP))
- Chromiumをベースとしたブラウザ (例: [Microsoft Edge](https://www.microsoft.com/ja-jp/edge), [Brave](https://brave.com/ja/))

## 対応環境

AIBPの各機能は、以下に示す各言語によるコード編集・コードテストに対応しています。

:::details JavaScript
### JavaScript

#### 対応するAtCoderのジャッジ環境 (2026年4月時点)

- JavaScript (Bun 1.2.21)
- JavaScript (Deno 2.4.5)
- JavaScript (Node.js 22.19.0)

#### テストコード実行環境の差異

AIBPのJavaScriptコードの実行環境は、AtCoderのジャッジ環境と一部異なる挙動を示します。
以下に、主な差異をまとめます。

##### 入力テキストの受け取り方法の制限

AIBPのJavaScriptコードは、以下の3パターンのコードを置き換えることで入力を与えます。

- `Main(require("fs").readFileSync("/dev/stdin", "utf8"));`
- `Main(await Deno.readTextFile("/dev/stdin"));`
- `Main(await Bun.file("/dev/stdin").text());`

置き換え先は`Main(__stdin__);`で、実行時に`__stdin__`に入力テキストが代入されます。
このため、上記以外の方法で入力を受け取るコードは、AIBP上では正しく動作しません。

##### `console`オブジェクトの利用

`console.log`・`console.error`以外の`console`オブジェクトのメソッドは、AIBP上では利用できません。

##### ES2024以降の機能の利用

AIBPのJavaScriptコードの実行環境は、ES2024以降の機能に対して完全なサポートを提供していません。
esbuild-wasmとcore-jsによるトランスパイルとPolyfillは行われますが、一部の機能はサポートされない可能性があります。

##### ライブラリの利用

AtCoderのジャッジ環境は`data-structure-typed`, `immutable`, `lodash`, `mathjs`, `tstl`を利用できますが、AIBPのJavaScriptコードの実行環境ではこれらのライブラリは利用できません。

##### コールスタックサイズの制限

AIBPのJavaScriptコードの実行環境は、コールスタックがwasmのスタックサイズに制限されています。
また、Proper Tail Callsに対応していないため、末尾再帰最適化も利用できません。
このため、深い再帰を必要とするコードは、AIBP上では正しく動作しない可能性があります。

#### 追加機能

##### IntelliSense

AIBPはMonaco Editorを搭載しているため、JavaScriptに対して、IntelliSense機能を利用できます。
コード補完や関数のシグネチャの表示など、VSCodeのようなコード編集体験が得られます。

##### Bun環境でDFSを書いた場合の警告

`Bun`・`dfs`の両方が含まれているコードを[Prepare Submission]ボタンで提出準備しようとすると、コールスタックサイズ制限により正しくコードが動作しない可能性がある旨を警告します。
:::

:::details TypeScript
### TypeScript

#### 対応するAtCoderのジャッジ環境 (2026年4月時点)

- TypeScript 5.8 (Deno 2.4.5)
- TypeScript 5.9 (tsc 5.9.2 (Bun 1.2.21))
- TypeScript 5.9 (tsc 5.9.2 (Node.js 22.19.0))

#### テストコード実行環境の差異

AIBPのTypeScriptコードの実行環境は、AtCoderのジャッジ環境と一部異なる挙動を示します。
以下に、主な差異をまとめます。

##### 入力テキストの受け取り方法の制限

AIBPのJavaScriptコードは、以下の3パターンのコードを置き換えることで入力を与えます。

- `Main(require("fs").readFileSync("/dev/stdin", "utf8"));`
- `Main(await Deno.readTextFile("/dev/stdin"));`
- `Main(await Bun.file("/dev/stdin").text());`

置き換え先は`Main(__stdin__);`で、実行時に`__stdin__`に入力テキストが代入されます。
このため、上記以外の方法で入力を受け取るコードは、AIBP上では正しく動作しません。

##### `console`オブジェクトの利用

`console.log`・`console.error`以外の`console`オブジェクトのメソッドは、AIBP上では利用できません。

##### ES2024以降の機能の利用

AIBPのTypeScriptコードの実行環境は、ES2024以降の機能に対して完全なサポートを提供していません。
esbuild-wasmとcore-jsによるトランスパイルとPolyfillは行われますが、一部の機能はサポートされない可能性があります。

##### ライブラリの利用

AtCoderのジャッジ環境は`data-structure-typed`, `immutable`, `lodash`, `mathjs`, `tstl`を利用できますが、AIBPのTypeScriptコードの実行環境ではこれらのライブラリは利用できません。

##### コールスタックサイズの制限

AIBPのJavaScriptコードの実行環境は、コールスタックがwasmのスタックサイズに制限されています。
また、Proper Tail Callsに対応していないため、末尾再帰最適化も利用できません。
このため、深い再帰を必要とするコードは、AIBP上では正しく動作しない可能性があります。

#### 追加機能

##### IntelliSense

AIBPはMonaco Editorを搭載しているため、TypeScriptに対して、IntelliSense機能を利用できます。
コード補完や関数のシグネチャの表示など、VSCodeのようなコード編集体験が得られます。

##### 型チェック

AIBPでTypeScriptコードを編集する際、Monaco Editorの機能により、リアルタイムで型チェックが行われます。
コード内の型エラーは、VSCodeと同様に、エラー箇所に波線が表示され、エラーの内容も確認できます。

##### Bun環境でDFSを書いた場合の警告

`Bun`・`dfs`の両方が含まれているコードを[Prepare Submission]ボタンで提出準備しようとすると、コールスタックサイズ制限により正しくコードが動作しない可能性がある旨を警告します。
:::

::::details Python
### TypeScript

#### 対応するAtCoderのジャッジ環境 (2026年4月時点)

- Python (CPython 3.13.7)
- Python (PyPy 3.11-v7.3.20)

:::warning
「Python (Codon 0.19.3)」環境には対応していないことに注意してください。
:::

#### テストコード実行環境の差異

AIBPのPythonコードの実行環境は、AtCoderのジャッジ環境と一部異なる挙動を示します。
以下に、主な差異をまとめます。

##### 使えるライブラリの制限

AtCoderのジャッジ環境で使用できるライブラリのうち、以下のライブラリはAIBPのPythonコードの実行環境では利用できません。

- PuLP
- acl-cpp-python
- cppyy
- more-itertools
- pandas
- scikit-learn
- shapely
- z3-solver

なお、以下のAtCoderのジャッジ環境で使用できるライブラリは、AIBPのPythonコードの実行環境でも利用できます。

- ac-library-python
- bitarray
- mpmath
- networkx
- numpy
- scipy
- sortedcontainers
- sympy
::::

:::details Text
### Text

#### 対応するAtCoderのジャッジ環境 (2026年4月時点)

- Text (cat 9.4)
:::
