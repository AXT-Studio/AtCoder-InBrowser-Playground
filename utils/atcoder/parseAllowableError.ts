/**
 * AtCoderの問題ページのDOMから許容誤差の指数をパースします。
 * UI は `1e-` 固定＋指数欄なので、指数（例: 6 → 1e-6）を返す。
 * (将来的にパース方法が思いついたら実装されます。現在はデフォルト値として 6 を返します。)
 * @returns 許容誤差の指数（`1e-N` の N）
 */
export const parseAllowableError = (): number => {
    return 6;
};
