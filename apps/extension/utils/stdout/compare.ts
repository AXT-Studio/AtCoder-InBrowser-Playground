// ================================================================================================
// 2つの出力を(AtCoder基準で)一致比較する
// ================================================================================================

// ----------------------------------------------------------------
// 期待出力とstdoutが「一致」しているかを判定する関数
// 数値の場合は許容誤差を考慮して比較
// ----------------------------------------------------------------

export const isStdoutCorrect = (
    expected: string,
    actual: string,
    allowableError: number,
): boolean => {
    // 両方を改行・スペース区切りで2次元配列にする
    const expectedLines = expected
        .trim()
        .split("\n")
        .map((row) => row.trim().split(" "));
    const actualLines = actual
        .trim()
        .split("\n")
        .map((row) => row.trim().split(" "));
    // 行数・列数が異なる場合は不一致
    if (expectedLines.length !== actualLines.length) {
        return false;
    }
    // 各行・各要素ごとに比較
    for (let i = 0; i < expectedLines.length; i++) {
        const expectedRow = expectedLines[i];
        const actualRow = actualLines[i];
        if (expectedRow.length !== actualRow.length) {
            return false;
        }
        for (let j = 0; j < expectedRow.length; j++) {
            // 数値として比較可能かどうかをチェック
            const expectedValue = expectedRow[j];
            const actualValue = actualRow[j];
            const expectedNumber = Number(expectedValue);
            const actualNumber = Number(actualValue);
            const expectedIsNumber = !Number.isNaN(expectedNumber);
            const actualIsNumber = !Number.isNaN(actualNumber);
            if (expectedIsNumber && actualIsNumber) {
                // 両方数値の場合、許容誤差内かどうかをチェック
                if (Math.abs(expectedNumber - actualNumber) > allowableError) {
                    return false;
                }
            } else {
                // どちらかが数値でない場合、文字列として完全一致かどうかをチェック
                if (expectedValue !== actualValue) {
                    return false;
                }
            }
        }
    }
    return true;
};
