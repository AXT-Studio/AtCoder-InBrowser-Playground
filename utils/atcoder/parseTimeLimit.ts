/**
 * AtCoderの問題ページのDOMから実行時間制限をパースします。
 * パースに失敗した場合は 2000ms を返します。
 * @returns 実行時間制限 (ミリ秒)
 */
export const parseTimeLimit = (): number => {
    const problemInfoDivs = document.querySelectorAll<HTMLElement>(".row > .col-sm-12");
    for (const div of problemInfoDivs) {
        const text = div.innerText;
        const match = text.match(/実行時間制限:\s*([\d.]+)\s*sec/);
        if (match) {
            const timeLimitSec = Number.parseFloat(match[1]);
            if (!Number.isNaN(timeLimitSec)) {
                return Math.ceil(timeLimitSec * 1000);
            }
        }
    }
    return 2000;
};
