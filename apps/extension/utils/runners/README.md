# Code Test: Runner Modules

ローカルコードテスト機能の実行方法を提供します。

## 各モジュールの構成

`./<language>/module.ts`は`<language>`の実行の公開APIで、以下の2つのメソッドを提供します。

### `init(): Promise<CodeTestContext["<language>"]>`

`<language>`の実行環境の生成・初期化を行い、`<language>`コードの実行に必要な環境を(Promiseの履行で)返します。
実行環境の生成・初期化に失敗した場合、Promiseは`Error`で拒否されます。

### `run(ctx: CodeTestContext["<language>"], code: string, stdin: string): Promise<Result<{stdout: string, stderr: string}, {status: "RE"|"CE", error: string}>>`

`ctx`を用いて、`code`に`stdin`を標準入力として与えて実行し、その結果をPromiseで返します。
実行に成功した場合は標準出力と標準エラーをそれぞれ文字列で、失敗した場合はエラーの内容と種類(RE, CE)を返します。


