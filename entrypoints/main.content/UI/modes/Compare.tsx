import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { parseSampleCases } from "@/utils/atcoder/parseSampleCases";
import { prepareSubmission } from "@/utils/atcoder/prepareSubmission";
import type { ExecRequestMessage, ExecResponseMessage } from "@/utils/execution/types";
import { listTemplates } from "@/utils/templates";
import { judgeCompareVerdict } from "@/utils/stdout/judgeCompareVerdict";
import { statusColor } from "@/utils/stdout/statusColor";
import { applyTemplateInsert, defaultTemplateId } from "../applyTemplateInsert";
import { MonacoEditor } from "../monaco/MonacoEditor";
import {
    epsExponent,
    naiveCode,
    naiveLanguage,
    setBufferCode,
    setBufferLanguage,
    submissionCode,
    submissionLanguage,
    timeLimitMs,
} from "../state";

export function Compare() {
    const samplesRef = useRef<ReturnType<typeof parseSampleCases> | null>(null);
    if (samplesRef.current === null) {
        samplesRef.current = parseSampleCases();
    }
    const samples = samplesRef.current;
    const sampleNames = [...samples.names];

    const panelOpen = useSignal(false);
    const stdin = useSignal("");
    const solveStdout = useSignal("");
    const solveStderr = useSignal("");
    const naiveStdout = useSignal("");
    const naiveStderr = useSignal("");
    const statusText = useSignal("--");
    const running = useSignal(false);
    const selectedTemplate = useSignal(defaultTemplateId(naiveLanguage.value, "naive"));
    const templateOptions = listTemplates(naiveLanguage.value, "naive");

    const execOnce = async (language: string, code: string, stdinValue: string) => {
        const req = {
            type: "execRequest",
            id: crypto.randomUUID(),
            language,
            code,
            stdin: stdinValue,
            timeLimitMs: timeLimitMs.value,
        } satisfies ExecRequestMessage;
        const res = (await browser.runtime.sendMessage(req)) as ExecResponseMessage;
        return res.codeTestResult;
    };

    const runTest = async (override?: { stdin?: string }) => {
        if (running.value) return;

        if (override?.stdin !== undefined) {
            stdin.value = override.stdin;
        }
        const stdinToUse = override?.stdin ?? stdin.value;

        running.value = true;
        statusText.value = "WJ";
        solveStdout.value = "";
        solveStderr.value = "";
        naiveStdout.value = "";
        naiveStderr.value = "";

        try {
            const allowableError = 10 ** -epsExponent.value;

            // 1) Naive 先
            const naiveResult = await execOnce(naiveLanguage.value, naiveCode.value, stdinToUse);
            naiveStdout.value = naiveResult.stdout;
            naiveStderr.value = naiveResult.stderr;

            if (naiveResult.status !== "completed") {
                statusText.value = judgeCompareVerdict(naiveResult, null, allowableError);
                return;
            }

            // 2) Solve (submission)
            const solveResult = await execOnce(submissionLanguage.value, submissionCode.value, stdinToUse);
            solveStdout.value = solveResult.stdout;
            solveStderr.value = solveResult.stderr;

            statusText.value = judgeCompareVerdict(naiveResult, solveResult, allowableError);
        } catch (error) {
            statusText.value = "Error";
            naiveStderr.value = String(error);
            solveStdout.value = "";
            solveStderr.value = "";
            naiveStdout.value = "";
        } finally {
            running.value = false;
        }
    };

    const runExample = (name: string) => {
        void runTest({
            stdin: samples.input.get(name) ?? "",
        });
    };

    return (
        <>
            <div class="aibp-editor">
                <MonacoEditor
                    value={naiveCode.value}
                    language={naiveLanguage.value}
                    onChange={(value) => {
                        setBufferCode("naive", value);
                    }}
                />
            </div>

            <div class="aibp-editor-toolbar">
                <div class="aibp-field">
                    <label class="aibp-label" for="aibp-editor-toolbar__language-select">
                        Language
                    </label>
                    <select
                        class="aibp-select"
                        id="aibp-editor-toolbar__language-select"
                        value={naiveLanguage.value}
                        onChange={(e) => {
                            const language = (e.target as HTMLSelectElement).value;
                            setBufferLanguage("naive", language);
                            selectedTemplate.value = defaultTemplateId(language, "naive");
                        }}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="plaintext">Text (cat)</option>
                    </select>
                </div>

                <div class="aibp-field aibp-field--grow">
                    <label class="aibp-label" for="aibp-editor-toolbar__template-select">
                        Template
                    </label>
                    <div class="aibp-field__row">
                        <select
                            class="aibp-select"
                            id="aibp-editor-toolbar__template-select"
                            value={selectedTemplate.value}
                            disabled={templateOptions.length === 0}
                            onChange={(e) => {
                                selectedTemplate.value = (e.target as HTMLSelectElement).value;
                            }}
                        >
                            {templateOptions.length === 0 ? (
                                <option value="">No templates</option>
                            ) : (
                                templateOptions.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.label}
                                    </option>
                                ))
                            )}
                        </select>
                        <button
                            class="aibp-btn aibp-btn--ghost"
                            type="button"
                            disabled={templateOptions.length === 0}
                            onClick={() => {
                                applyTemplateInsert({
                                    buffer: "naive",
                                    templateKey: selectedTemplate.value,
                                    currentCode: naiveCode.value,
                                });
                            }}
                        >
                            Insert
                        </button>
                    </div>
                </div>

                <div class="aibp-editor-toolbar__submit">
                    <button
                        class="aibp-btn aibp-btn--primary"
                        type="button"
                        id="aibp-editor-toolbar__submit-button"
                        onClick={() => {
                            prepareSubmission(submissionCode.value);
                        }}
                    >
                        Prepare Submission
                    </button>
                </div>
            </div>

            <div class="aibp-test-section">
                <div class="aibp-test-section__bar">
                    {sampleNames.length > 0 && (
                        <div class="aibp-examples">
                            <span class="aibp-label">Examples</span>
                            <ol class="aibp-examples__list">
                                {sampleNames.map((name) => (
                                    <li key={name}>
                                        <button
                                            type="button"
                                            class="aibp-chip"
                                            disabled={running.value}
                                            title={`入力例 ${name} で Compare`}
                                            onClick={() => {
                                                runExample(name);
                                            }}
                                        >
                                            {name}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    <div class="aibp-status">
                        <span class="aibp-status__item">
                            <span class="aibp-label">Status</span>
                            <span class="aibp-status__value" data-color={statusColor(statusText.value)}>
                                {statusText.value}
                            </span>
                        </span>
                    </div>

                    <div class="aibp-limits">
                        <label class="aibp-field aibp-field--inline">
                            <span class="aibp-label">TL</span>
                            <input
                                type="number"
                                class="aibp-input aibp-input--narrow"
                                min="0"
                                max="10000"
                                step="100"
                                value={timeLimitMs.value}
                                onInput={(e) => {
                                    timeLimitMs.value = Number((e.target as HTMLInputElement).value);
                                }}
                            />
                            <span class="aibp-unit">ms</span>
                        </label>
                        <label class="aibp-field aibp-field--inline">
                            <span class="aibp-label">eps</span>
                            <span class="aibp-unit">1e-</span>
                            <input
                                type="number"
                                class="aibp-input aibp-input--tiny"
                                min="1"
                                max="12"
                                step="1"
                                value={epsExponent.value}
                                onInput={(e) => {
                                    epsExponent.value = Number((e.target as HTMLInputElement).value);
                                }}
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        class="aibp-btn aibp-btn--ghost aibp-test-section__toggle"
                        aria-expanded={panelOpen.value}
                        onClick={() => {
                            panelOpen.value = !panelOpen.value;
                        }}
                    >
                        {panelOpen.value ? "Hide cases" : "Show cases"}
                    </button>
                </div>

                {/*
                    折りたたみは unmount せず hidden で隠す。
                    Examples 実行後に開いても入出力・結果が残る（DOM 維持）。
                */}
                <div class="aibp-test-section__panel" hidden={!panelOpen.value}>
                    <div class="aibp-io-grid">
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-compare-testcase-input">
                                Input
                            </label>
                            <textarea
                                id="aibp-compare-testcase-input"
                                class="aibp-textarea"
                                spellcheck={false}
                                value={stdin.value}
                                onInput={(e) => {
                                    stdin.value = (e.target as HTMLTextAreaElement).value;
                                }}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-testcase-solve-stdout">
                                Solve Stdout
                            </label>
                            <textarea
                                id="aibp-testcase-solve-stdout"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={solveStdout.value}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-testcase-solve-stderr">
                                Solve Stderr
                            </label>
                            <textarea
                                id="aibp-testcase-solve-stderr"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={solveStderr.value}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-testcase-naive-stdout">
                                Naive Stdout
                            </label>
                            <textarea
                                id="aibp-testcase-naive-stdout"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={naiveStdout.value}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-testcase-naive-stderr">
                                Naive Stderr
                            </label>
                            <textarea
                                id="aibp-testcase-naive-stderr"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={naiveStderr.value}
                            />
                        </div>
                    </div>

                    <div class="aibp-test-section__run-row">
                        <button
                            type="button"
                            class="aibp-btn aibp-btn--accent"
                            id="aibp-test-section__run-btn"
                            disabled={running.value}
                            onClick={() => {
                                void runTest();
                            }}
                        >
                            {running.value ? "Running…" : "Run Test"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
