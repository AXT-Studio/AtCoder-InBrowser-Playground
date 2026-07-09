import type {
    ContentScriptMessage,
    CodeTestResultWithTLE,
    CodeTestContext,
} from "@/utils/runners/types";

// ----------------------------------------------------------------
// 設定上のlanguageとRunner Workerのlanguageの対応表
// ----------------------------------------------------------------
const languageMap: Record<string, keyof CodeTestContext> = {
    plaintext: "plaintext",
    typescript: "typescript",
    python: "python",
    javascript: "typescript", // <- これだけ例外で、JSはTSのRunnerで動かせるしそうする
};

// ----------------------------------------------------------------
// コードを実行する
// ----------------------------------------------------------------
export const executeCode = async (
    selectedLanguage: string,
    code: string,
    stdin: string,
    timeLimitMs: number,
): Promise<CodeTestResultWithTLE> => {
    // ---- 使用言語について、対象外ならエラーを返す ----
    if (languageMap[selectedLanguage] == null) {
        return {
            status: "failure",
            details: {
                kind: "CE",
                message: `Unsupported language: ${selectedLanguage}`,
            },
        };
    }
    const language = languageMap[selectedLanguage];
    const messageData: ContentScriptMessage = {
        type: "exec",
        language,
        code,
        stdin,
        timeLimitMs,
    };
    // browser.runtime.sendMessageはBackground Scriptからの応答で解決するPromiseを返すので、それを待つ
    const response = await browser.runtime.sendMessage<
        ContentScriptMessage,
        CodeTestResultWithTLE | null | undefined
    >(messageData);
    // responseにはnullishが混入しうるらしく、nullishな場合はエラーとして扱う必要がある
    if (response == null) {
        return {
            status: "failure",
            details: {
                kind: "CE",
                message: "No response from background script. Possible communication failure.",
            },
        };
    }
    // responseがnullishでないことを確認したので、CodeTestResultWithTLEとして返す
    return response;
};
