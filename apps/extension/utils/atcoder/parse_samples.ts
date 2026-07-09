// ================================================================================================
// AtCoderの問題ページのDOMから入出力例をパース
// ================================================================================================

export const parseSampleCases = (): {
    names: Set<string>;
    input: Map<string, string>;
    output: Map<string, string>;
} => {
    // ==== 入力例・出力例のペアを取得 ====
    const samples = {
        names: new Set<string>(),
        input: new Map<string, string>(),
        output: new Map<string, string>(),
    };
    const sampleElements = document.querySelectorAll(".lang-ja section:has(h3~pre)");
    sampleElements.forEach((section) => {
        const sampleH3Text = section.querySelector("h3")?.childNodes?.[0]?.textContent ?? "";
        const samplePreText = section.querySelector("pre")?.childNodes?.[0]?.textContent ?? "";
        if (sampleH3Text.startsWith("入力例 ")) {
            const sampleName = sampleH3Text.slice("入力例 ".length).trim();
            samples.names.add(sampleName);
            samples.input.set(sampleName, samplePreText);
        }
        if (sampleH3Text.startsWith("出力例 ")) {
            const sampleName = sampleH3Text.slice("出力例 ".length).trim();
            samples.names.add(sampleName);
            samples.output.set(sampleName, samplePreText);
        }
    });
    return samples;
};
