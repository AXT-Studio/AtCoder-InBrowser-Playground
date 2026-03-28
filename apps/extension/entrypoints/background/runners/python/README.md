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

## 4) パッケージ読み込み方法

現在の対象パッケージ:

- bitarray
- more-itertools
- networkx
- numpy
- scipy
- sortedcontainers
- sympy
- ac-library-python

### 4-1) ローカル同梱パッケージの読み込み（`loadPackage`）

次のパッケージは build 時に `assets/pyodide/` へ同梱される想定です。

- bitarray
- numpy
- scipy

読み込みは `loadPackage` を優先します。

```ts
await pyodide.loadPackage(["bitarray", "numpy", "scipy"]);
```

`indexURL` は `browser.runtime.getURL("/assets/pyodide/")` を使うため、同梱済みファイルがあればネットワークを使わずに読み込まれます。

### 4-2) PyPI 経由パッケージの読み込み（`micropip.install`）

同梱対象外のパッケージは `micropip` でインストールします。

- more-itertools
- networkx
- sortedcontainers
- sympy
- ac-library-python

```ts
await pyodide.loadPackage("micropip");
const micropip = pyodide.pyimport("micropip");
await micropip.install([
  "more-itertools",
  "networkx",
  "sortedcontainers",
  "sympy",
  "ac-library-python",
]);
```

運用ルールは次の通りです。

1. 同梱対象は `loadPackage` を使う
2. 同梱対象外は `micropip.install` を使う
3. 失敗時は runner の `setup-error` / `runtime-error` に正規化して返す

## 5) エラーハンドリング

初期化・実行は `try/catch` で包み、失敗を runner の `setup-error` / `runtime-error` として返して UI に分かりやすく表示できるようにします。
