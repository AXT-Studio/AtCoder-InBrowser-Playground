import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type { editor } from "monaco-editor";
import { parseSampleCases } from "@/utils/atcoder/parseSampleCases";
import type { ExecRequestMessage, ExecResponseMessage } from "@/utils/execution/types";
import { listTemplates } from "@/utils/templates";
import { judgeSolveVerdict } from "@/utils/stdout/judgeSolveVerdict";
import { statusColor } from "@/utils/stdout/statusColor";
import { applyPrepareSubmission } from "../applyPrepareSubmission";
import { applyTemplateInsert, defaultTemplateId } from "../applyTemplateInsert";
import { MonacoEditor } from "../monaco/MonacoEditor";
import {
    epsExponent,
    setBufferCode,
    setBufferLanguage,
    submissionCode,
    submissionLanguage,
    timeLimitMs,
} from "../state";

export function Solve() {
    const samplesRef = useRef<ReturnType<typeof parseSampleCases> | null>(null);
    if (samplesRef.current === null) {
        samplesRef.current = parseSampleCases();
    }
    const samples = samplesRef.current;
    const sampleNames = [...samples.names];

    const panelOpen = useSignal(false);
    const stdin = useSignal("");
    const expected = useSignal("");
    const stdout = useSignal("");
    const stderr = useSignal("");
    const statusText = useSignal("--"); // Not executed(未実行)のときは--と表示
    const execTimeText = useSignal("-- ms");
    const running = useSignal(false);
    const selectedTemplate = useSignal(defaultTemplateId(submissionLanguage.value, "submission"));
    const templateOptions = listTemplates(submissionLanguage.value, "submission");
    const monacoEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const runTest = async (override?: { stdin?: string; expected?: string }) => {
        if (running.value) return;

        if (override?.stdin !== undefined) {
            stdin.value = override.stdin;
        }
        if (override?.expected !== undefined) {
            expected.value = override.expected;
        }

        const stdinToUse = override?.stdin ?? stdin.value;
        const expectedToUse = override?.expected ?? expected.value;

        running.value = true;
        statusText.value = "WJ"; // WJ: Waiting for Judge
        execTimeText.value = "-- ms";
        try {
            const req = {
                type: "execRequest",
                id: crypto.randomUUID(),
                language: submissionLanguage.value,
                code: submissionCode.value,
                stdin: stdinToUse,
                timeLimitMs: timeLimitMs.value,
            } satisfies ExecRequestMessage;

            const res = (await browser.runtime.sendMessage(req)) as ExecResponseMessage;
            const { codeTestResult } = res;

            stdout.value = codeTestResult.stdout;
            stderr.value = codeTestResult.stderr;
            execTimeText.value = codeTestResult.execTime < 0 ? "-- ms" : `${codeTestResult.execTime} ms`;

            const allowableError = 10 ** -epsExponent.value;
            statusText.value = judgeSolveVerdict(codeTestResult, expectedToUse, allowableError);
        } catch (error) {
            statusText.value = "Error";
            stderr.value = String(error);
            stdout.value = "";
            execTimeText.value = "-- ms";
        } finally {
            running.value = false;
        }
    };

    const runExample = (name: string) => {
        void runTest({
            stdin: samples.input.get(name) ?? "",
            expected: samples.output.get(name) ?? "",
        });
    };

    return (
        <>
            <div class="aibp-editor">
                <MonacoEditor
                    value={submissionCode.value}
                    language={submissionLanguage.value}
                    editorRef={monacoEditorRef}
                    onChange={(value) => {
                        setBufferCode("submission", value);
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
                        value={submissionLanguage.value}
                        onChange={(e) => {
                            const language = (e.target as HTMLSelectElement).value;
                            setBufferLanguage("submission", language);
                            selectedTemplate.value = defaultTemplateId(language, "submission");
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
                                    buffer: "submission",
                                    templateKey: selectedTemplate.value,
                                    currentCode: submissionCode.value,
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
                            applyPrepareSubmission({
                                code: submissionCode.value,
                                language: submissionLanguage.value,
                                editor: monacoEditorRef.current,
                            });
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
                                            title={`入力例 ${name} を実行`}
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
                        <span class="aibp-status__item">
                            <span class="aibp-label">Time</span>
                            <span class="aibp-status__value aibp-status__value--plain">{execTimeText.value}</span>
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
                    本実装では Signals に載せて value バインドする想定。
                */}
                <div class="aibp-test-section__panel" hidden={!panelOpen.value}>
                    <div class="aibp-io-grid">
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-testcase-input">
                                Input
                            </label>
                            <textarea
                                id="aibp-testcase-input"
                                class="aibp-textarea"
                                spellcheck={false}
                                value={stdin.value}
                                onInput={(e) => {
                                    stdin.value = (e.target as HTMLTextAreaElement).value;
                                }}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-testcase-expected">
                                Expected
                            </label>
                            <textarea
                                id="aibp-testcase-expected"
                                class="aibp-textarea"
                                spellcheck={false}
                                value={expected.value}
                                onInput={(e) => {
                                    expected.value = (e.target as HTMLTextAreaElement).value;
                                }}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-testcase-stdout">
                                Stdout
                            </label>
                            <textarea
                                id="aibp-testcase-stdout"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={stdout.value}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-testcase-stderr">
                                Stderr
                            </label>
                            <textarea
                                id="aibp-testcase-stderr"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={stderr.value}
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
