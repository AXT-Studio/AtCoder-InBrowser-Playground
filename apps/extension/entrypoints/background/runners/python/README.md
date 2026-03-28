# Python Runner + Pyodide メモ

このドキュメントは、background runner に Pyodide を組み込むための簡易ガイドです。

## 1) import と初期化

```ts
import { loadPyodide } from "pyodide";

const pyodide = await loadPyodide({
  indexURL: browser.runtime.getURL("/assets/pyodide/"),
});
```

`indexURL` は、`bundlePyodideRuntimeFiles.ts` が出力する同梱ランタイムファイルの場所を指す必要があります。

## 2) コード実行

```ts
const result = await pyodide.runPythonAsync(code);
```

パッケージ読み込みやユーザーコードの非同期処理を安全に扱うため、`runPythonAsync` を利用します。

## 3) stdin / stdout / stderr

- stdin: `pyodide.setStdin({ stdin: () => nextChunk })` で入力を供給
- stdout: `pyodide.setStdout({ batched: (line) => { ... } })` で出力を収集
- stderr: `pyodide.setStderr({ batched: (line) => { ... } })` でエラー出力を収集

テストケース間で状態が混ざらないように、実行ごとにハンドラを再設定してください。

## 4) パッケージ方針

現在の対象パッケージ:

- bitarray
- more-itertools
- networkx
- numpy
- scipy
- sortedcontainers
- sympy
- ac-library-python

推奨ロード順:

1. ローカルの Pyodide runtime/lock に含まれるものを優先して利用する
2. ローカルにないものだけ `micropip.install(...)` で補う

## 5) エラーハンドリング

初期化・実行は `try/catch` で包み、失敗を runner の `setup-error` / `runtime-error` として返して UI に分かりやすく表示できるようにします。
