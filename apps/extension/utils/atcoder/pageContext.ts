// ================================================================================================
// contestTitle, taskTitle, taskURLを取得
// ================================================================================================

export const getPageContext = (): {
    contestTitle: string;
    taskTitle: string;
    taskURL: string;
} => {
    const contestTitle =
        (window.document.querySelector("nav .contest-title") as HTMLElement)?.innerText.trim() ??
        "Unknown Contest";
    const taskTitle = window.document.title.trim() ?? "Unknown Task";
    const taskURL = window.location.href ?? "<Unknown URL>";
    return { contestTitle, taskTitle, taskURL };
};
