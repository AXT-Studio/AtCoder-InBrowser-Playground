import { useSignal } from "@preact/signals";
import { prepareSubmission } from "@/utils/atcoder/prepareSubmission";
import { epsExponent, submissionCode, timeLimitMs } from "../state";

export function Stress() {
    const panelOpen = useSignal(false);

    return (
        <>
            <div class="aibp-editor">
                <textarea class="aibp-editor__textarea" spellcheck={false} placeholder="// code (testcase generator)" />
                {/* ↑仮置き。あとで Monaco Editor に差し替える */}
            </div>

            <div class="aibp-editor-toolbar">
                <div class="aibp-field">
                    <label class="aibp-label" for="aibp-editor-toolbar__language-select">
                        Language
                    </label>
                    <select class="aibp-select" id="aibp-editor-toolbar__language-select">
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
                        <select class="aibp-select" id="aibp-editor-toolbar__template-select">
                            <option value="default">Default</option>
                            <option value="template1">Template 1</option>
                            <option value="template2">Template 2</option>
                            <option value="template3">Template 3</option>
                        </select>
                        <button class="aibp-btn aibp-btn--ghost" type="button">
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
                    <div class="aibp-status">
                        <span class="aibp-status__item">
                            <span class="aibp-label">Status</span>
                            <span class="aibp-status__value" data-color="gray">
                                Not executed
                            </span>
                        </span>
                        <span class="aibp-status__item">
                            <span class="aibp-label">Time</span>
                            <span class="aibp-status__value aibp-status__value--plain">-- ms</span>
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
                                value="20"
                            />
                            <span class="aibp-unit">times</span>
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
                            <label class="aibp-label" for="aibp-testcase-generated">
                                Generated Testcase
                            </label>
                            <textarea
                                id="aibp-testcase-generated"
                                class="aibp-textarea aibp-textarea--readonly"
                                readOnly
                                spellcheck={false}
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
                            />
                        </div>
                    </div>

                    <div class="aibp-test-section__run-row">
                        <button type="button" class="aibp-btn aibp-btn--accent" id="aibp-test-section__run-btn">
                            Run Test
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
