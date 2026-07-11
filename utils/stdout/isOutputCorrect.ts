/**
 * 期待出力と stdout が「一致」しているかを判定する。
 * 数値トークンは許容誤差を考慮し、それ以外は文字列完全一致。
 */
export const isOutputCorrect = (expected: string, actual: string, allowableError: number): boolean => {
    const expectedLines = expected
        .trim()
        .split("\n")
        .map((row) => row.trim().split(" "));
    const actualLines = actual
        .trim()
        .split("\n")
        .map((row) => row.trim().split(" "));

    if (expectedLines.length !== actualLines.length) {
        return false;
    }

    for (let i = 0; i < expectedLines.length; i++) {
        const expectedRow = expectedLines[i];
        const actualRow = actualLines[i];
        if (expectedRow.length !== actualRow.length) {
            return false;
        }
        for (let j = 0; j < expectedRow.length; j++) {
            const expectedValue = expectedRow[j];
            const actualValue = actualRow[j];
            const expectedNumber = Number(expectedValue);
            const actualNumber = Number(actualValue);
            const expectedIsNumber = !Number.isNaN(expectedNumber);
            const actualIsNumber = !Number.isNaN(actualNumber);
            if (expectedIsNumber && actualIsNumber) {
                if (Math.abs(expectedNumber - actualNumber) > allowableError) {
                    return false;
                }
            } else if (expectedValue !== actualValue) {
                return false;
            }
        }
    }
    return true;
};
