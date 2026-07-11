/**
 * AtCoder 問題ページの DOM からテンプレ用の文脈を取得する。
 */
export const getPageContext = (): {
    contestTitle: string;
    taskTitle: string;
    taskURL: string;
} => {
    const contestTitle =
        document.querySelector<HTMLElement>("nav .contest-title")?.innerText.trim() ?? "Unknown Contest";
    const taskTitle = document.title.trim() || "Unknown Task";
    const taskURL = window.location.href || "<Unknown URL>";
    return { contestTitle, taskTitle, taskURL };
};
