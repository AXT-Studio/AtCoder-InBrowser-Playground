import { useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type { editor } from "monaco-editor";
import type { ExecRequestMessage, ExecResponseMessage } from "@/utils/execution/types";
import { listTemplates } from "@/utils/templates";
import { judgeStressIteration } from "@/utils/stdout/judgeStressIteration";
import { statusColor } from "@/utils/stdout/statusColor";
import { applyPrepareSubmission } from "../applyPrepareSubmission";
import { applyTemplateInsert, defaultTemplateId } from "../applyTemplateInsert";
import { MonacoEditor } from "../monaco/MonacoEditor";
import {
    epsExponent,
    generatorCode,
    generatorLanguage,
    naiveCode,
    naiveLanguage,
    setBufferCode,
    setBufferLanguage,
    submissionCode,
    submissionLanguage,
    timeLimitMs,
} from "../state";

export function Stress() {
    const panelOpen = useSignal(false);
    const loopMax = useSignal(20);
    const generated = useSignal("");
    const solveStdout = useSignal("");
    const solveStderr = useSignal("");
    const naiveStdout = useSignal("");
    const naiveStderr = useSignal("");
    const statusText = useSignal("--");
    const running = useSignal(false);
    const selectedTemplate = useSignal(defaultTemplateId(generatorLanguage.value, "generator"));
    const templateOptions = listTemplates(generatorLanguage.value, "generator");
    const monacoEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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

    const runTest = async () => {
        if (running.value) return;

        const max = Math.floor(loopMax.value);
        running.value = true;
        statusText.value = "WJ";
        generated.value = "";
        solveStdout.value = "";
        solveStderr.value = "";
        naiveStdout.value = "";
        naiveStderr.value = "";

        try {
            const allowableError = 10 ** -epsExponent.value;

            if (max < 1) {
                statusText.value = "AC";
                return;
            }

            for (let i = 0; i < max; i++) {
                statusText.value = `WJ (${i + 1}/${max})`;

                // 1) Generator（stdin なし）
                const genResult = await execOnce(generatorLanguage.value, generatorCode.value, "");
                generated.value = genResult.stdout;
                if (genResult.status !== "completed") {
                    // Gen の stderr を見える場所へ
                    naiveStderr.value = genResult.stderr;
                    solveStderr.value = "";
                    solveStdout.value = "";
                    naiveStdout.value = "";
                    statusText.value = judgeStressIteration(genResult, null, null, allowableError) ?? "CE";
                    return;
                }

                const generatedInput = genResult.stdout;

                // 2) Naive
                const naiveResult = await execOnce(naiveLanguage.value, naiveCode.value, generatedInput);
                naiveStdout.value = naiveResult.stdout;
                naiveStderr.value = naiveResult.stderr;
                if (naiveResult.status !== "completed") {
                    solveStdout.value = "";
                    solveStderr.value = "";
                    statusText.value = judgeStressIteration(genResult, naiveResult, null, allowableError) ?? "CE";
                    return;
                }

                // 3) Solve (submission)
                const solveResult = await execOnce(submissionLanguage.value, submissionCode.value, generatedInput);
                solveStdout.value = solveResult.stdout;
                solveStderr.value = solveResult.stderr;

                const round = judgeStressIteration(genResult, naiveResult, solveResult, allowableError);
                if (round !== null) {
                    statusText.value = round;
                    return;
                }
            }

            statusText.value = "AC";
        } catch (error) {
            statusText.value = "Error";
            naiveStderr.value = String(error);
            generated.value = "";
            solveStdout.value = "";
            solveStderr.value = "";
            naiveStdout.value = "";
        } finally {
            running.value = false;
        }
    };

    return (
        <>
            <div class="aibp-editor">
                <MonacoEditor
                    initialValue={generatorCode.value}
                    language={generatorLanguage.value}
                    editorRef={monacoEditorRef}
                    onChange={(value) => {
                        setBufferCode("generator", value);
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
                        value={generatorLanguage.value}
                        onChange={(e) => {
                            const language = (e.target as HTMLSelectElement).value;
                            setBufferLanguage("generator", language);
                            selectedTemplate.value = defaultTemplateId(language, "generator");
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
                                    buffer: "generator",
                                    templateKey: selectedTemplate.value,
                                    editor: monacoEditorRef.current,
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
                                editor: null,
                            });
                        }}
                    >
                        Prepare Submission
                    </button>
                </div>
            </div>

            <div class="aibp-test-section">
                <div class="aibp-test-section__bar">
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
                        <label class="aibp-field aibp-field--inline">
                            <span class="aibp-label">Loop (max)</span>
                            <input
                                type="number"
                                class="aibp-input aibp-input--narrow"
                                min="0"
                                max="100"
                                step="10"
                                value={loopMax.value}
                                onInput={(e) => {
                                    loopMax.value = Number((e.target as HTMLInputElement).value);
                                }}
                            />
                            <span class="aibp-unit">times</span>
                        </label>
                    </div>

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
                    実行後に開いても結果が残る（DOM 維持）。
                    Stress は DECISIONS どおり折りたたみ時も Run Test をバーに残す。
                */}
                <div class="aibp-test-section__panel" hidden={!panelOpen.value}>
                    <div class="aibp-io-grid">
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-testcase-generated">
                                Generated Testcase
                            </label>
                            <textarea
                                id="aibp-testcase-generated"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={generated.value}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-stress-solve-stdout">
                                Solve Stdout
                            </label>
                            <textarea
                                id="aibp-stress-solve-stdout"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={solveStdout.value}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-stress-naive-stdout">
                                Naive Stdout
                            </label>
                            <textarea
                                id="aibp-stress-naive-stdout"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={naiveStdout.value}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-stress-solve-stderr">
                                Solve Stderr
                            </label>
                            <textarea
                                id="aibp-stress-solve-stderr"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={solveStderr.value}
                            />
                        </div>
                        <div class="aibp-io">
                            <label class="aibp-label" for="aibp-stress-naive-stderr">
                                Naive Stderr
                            </label>
                            <textarea
                                id="aibp-stress-naive-stderr"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
                                value={naiveStderr.value}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
