# 既知の不具合

このページでは、AIBPの最新バージョンの既知の不具合に関する情報をまとめています。

## 近日修正予定の不具合

[GitHub Issues](https://github.com/AXT-Studio/AtCoder-InBrowser-Playground/issues)をご確認ください。

## 長期的な対応が予想される事象

以下に示す事象は、根本的な修正に時間を要するか、修正対応の必要性や方法などを検討する必要があるため、長期的な対応が予想されるものです。

### JavaScript・TypeScriptにおいて、各実行環境と[Run Test]で`console.log()`の出力結果が異なる場合がある

[Issue #39](https://github.com/AXT-Studio/AtCoder-InBrowser-Playground/issues/39)

JavaScript・TypeScriptのコードテストにおいて、標準出力の内容が本番(ジャッジ)環境と異なる例がいくつかあります。
この問題は、以下の理由から至急の対応を要するものではないと判断しています。

- AtCoderで出力として要求される範囲(`string`, `number`)については問題なく出力できていること。
    - それ以外の型(Object含む)の出力を提出時に使うことは事実上ないと考えられ、そのような型についてはデバッグに十分な情報があれば実用上問題ないと考えられること。
- 完全な対応のためには、Node.jsの出力の調査と独自のシリアライズ処理が必要になると考えられること。
    - これらの対応は、他の優先度の高い対応と比べて工数が大きいと考えられること。
