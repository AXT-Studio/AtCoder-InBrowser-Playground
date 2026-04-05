# Code Test Utils

ローカルコードテスト機能の実行方法を提供します。

## Runner Modules

`./<language>/module.ts`は`<language>`の実行の公開APIで、以下の2つのメソッドを提供します。

### `init(): Promise<CodeTestContext["<language>"]>`

`<language>`の実行環境の生成・初期化を行い、`<language>`コードの実行に必要な環境を(Promiseの履行で)返します。
実行環境の生成・初期化に失敗した場合、Promiseは`Error`で拒否されます。

### `run(ctx: CodeTestContext["<language>"], code: string, stdin: string): Promise<Result<{stdout: string, stderr: string}, {status: "RE"|"CE", error: string}>>`

`ctx`を用いて、`code`に`stdin`を標準入力として与えて実行し、その結果をPromiseで返します。
実行に成功した場合は標準出力と標準エラーをそれぞれ文字列で、失敗した場合はエラーの内容と種類(RE, CE)を返します。

## Runner Worker

`./worker.ts`はコード実行を行います。コード実行部分をWorkerとして分離することで並列処理や実行打ち切りを実現します。

Runner Workerの責務は以下です。

- 通信相手から渡される`{言語, コード, stdin}`を適切なRunner Moduleを使って実行して返す
- Runner Contextをキャッシュする

Content ScriptとBackground Scriptの間の通信プロトコルは以下のとおりです。

1. Background ScriptまたはOffscreen DocumentからRunner Workerに、以下の型のオブジェクトを送ります。
    - `{ type: "exec", language: keyof CodeTestContext, code: string, stdin: string }`
2. Runner Workerは実行直前まで進めたあと、呼び出し元に以下の型のオブジェクトを送ります。
    - `{ type: "ready" }`
3. Runner Workerはコードを実行し、完了したら呼び出し元に`Success`, `Failure`の`details`がそれぞれ以下の型である`Result`型オブジェクトを送ります。
    - Success: `{ stdout: string, stderr: string }`
    - Failure: `{ kind: "RE"|"CE", message: string }`

## Background Script

`entrypoints/background/index.ts`は、FirefoxにおいてContent ScriptとRunner Workerの橋渡しを行うBackground Scriptです。

Background Scriptの責務は以下です。

- Content Scriptから渡される`{言語, コード, stdin, 実行時間制限}`をRunner Workerに渡して実行しながら、実行打ち切りを行う
- Runner Workerを使い回せる(Success)ならキャッシュし、使い回せない(FailureかTLE打ち切り)なら再起動する

Content ScriptとBackground Scriptの間の通信プロトコルは以下のとおりです。

1. Content ScriptからBackground Scriptに、以下の型のオブジェクトを送ります。
    - `{ type: "exec", language: keyof CodeTestContext, code: string, stdin: string, timeLimitMs: number }`
2. Background Scriptはコードを実行し、Content Scriptに`Success`, `Failure`の`details`がそれぞれ以下の型である`Result`型オブジェクトを送ります。
    - Success: `{ stdout: string, stderr: string }`
    - Failure: `{ kind: "RE"|"CE"|"TLE", message: string }`
