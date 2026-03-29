# TypeScript

AIBPは、TypeScriptを対応するプログラミング言語としてサポートしています。

## テストコード実行環境の差異

AIBPのTypeScriptコードの実行環境は、AtCoderのジャッジ環境と一部異なる挙動を示します。
以下に、主な差異をまとめます。

### 入力テキストの受け取り方法の制限

AIBPのTypeScriptコードは、以下の3パターンのコードを置き換えることで入力を与えます。

- `Main(require("fs").readFileSync("/dev/stdin", "utf8"));`
- `Main(await Deno.readTextFile("/dev/stdin"));`
- `Main(await Bun.file("/dev/stdin").text());`

置き換え先は`Main(__stdin__);`で、実行時に`__stdin__`に入力テキストが代入されます。
このため、上記以外の方法で入力を受け取るコードは、AIBP上では正しく動作しません。

### `console`オブジェクトの利用

`console.log`・`console.error`以外の`console`オブジェクトのメソッドは、AIBP上では利用できません。

### ES2024以降の機能の利用

AIBPのTypeScriptコードの実行環境は、ES2024以降の機能に対して完全なサポートを提供していません。
esbuild-wasmとcore-jsによるトランスパイルとPolyfillは行われますが、一部の機能はサポートされない可能性があります。

### ライブラリの利用

AtCoderのジャッジ環境は`data-structure-typed`, `immutable`, `lodash`, `mathjs`, `tstl`を利用できますが、AIBPのTypeScriptコードの実行環境ではこれらのライブラリは利用できません。

### コールスタックサイズの制限

AIBPのJavaScriptコードの実行環境は、コールスタックがwasmのスタックサイズに制限されています。
また、Proper Tail Callsに対応していないため、末尾再帰最適化も利用できません。
このため、深い再帰を必要とするコードは、AIBP上では正しく動作しない可能性があります。

## 追加機能

### IntelliSense

AIBPはMonaco Editorを搭載しているため、TypeScriptに対して、IntelliSense機能を利用できます。
コード補完や関数のシグネチャの表示など、VSCodeのようなコード編集体験が得られます。

### 型チェック

AIBPでTypeScriptコードを編集する際、Monaco Editorの機能により、リアルタイムで型チェックが行われます。
コード内の型エラーは、VSCodeと同様に、エラー箇所に波線が表示され、エラーの内容も確認できます。

### Bun環境でDFSを書いた場合の警告

`Bun`・`dfs`の両方が含まれているコードを[Prepare Submission]ボタンで提出準備しようとすると、コールスタックサイズ制限により正しくコードが動作しない可能性がある旨を警告します。
