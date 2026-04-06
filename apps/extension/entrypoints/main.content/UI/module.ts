// ================================================================================================
// 拡張機能用のUIのDOM要素を生成し、各種イベントを設定して返す。
// - DOM要素の生成はここにあるHTMLテンプレートとDOMParserを使って行います。
// - 要素に付ける機能(イベント)などは、別ファイルで関数をexportしてこちらでcallする形にしてください。
//     - 同じフォルダに各機能ごとのsetupXXX.tsを作るとよいでしょう。
//     - exportすべき関数の形は、`setupXXX(container: HTMLDivElement): Promise<void>`です。
// ================================================================================================

import { setupExampleAutoExecButtons } from "./setups/exampleAutoExecButtons";
// ----------------------------------------------------------------
// setup関数群のimport
// ----------------------------------------------------------------
import { setupGlobalSettingsSetter } from "./setups/globalSettingsSetter";
import { setupInPageSettingsSetter } from "./setups/inPageSettingsSetter";
import { setupMonacoEditor } from "./setups/monacoEditor";
import { setupPrepareSubmissionButton } from "./setups/prepareSubmissionButton";
import { setupRunTestButton } from "./setups/runTestButton";
import { setupTabSwitching } from "./setups/tabSwitching";
import { setupTemplateInserter } from "./setups/templateInserter";

// ----------------------------------------------------------------
// DOM要素の生成
// ----------------------------------------------------------------
const html = `\
<div id="aibp-container">
    <div id="monaco-editor-container"></div>
    <div class="tab-container">
        <div class="tab-bar">
            <button class="tab-button" id="tab-button-operation">Operation</button>
            <button class="tab-button" id="tab-button-test">Test</button>
            <button class="tab-button" id="tab-button-settings">Settings</button>
        </div>
        <div class="tab-contents">
            <div class="tab-content" id="tab-content-operation">
                <section class="tab-content-section" id="sect-op-template">
                    <h2>Template</h2>
                    <table id="table-op-template">
                        <tbody>
                            <tr>
                                <th>JavaScript</th>
                                <td><button id="template-js_node">Node.js</button></td>
                                <td><button id="template-js_deno">Deno</button></td>
                                <td><button id="template-js_bun">Bun</button></td>
                            </tr>
                            <tr>
                                <th>TypeScript</th>
                                <td><button id="template-ts_node">Node.js</button></td>
                                <td><button id="template-ts_deno">Deno</button></td>
                                <td><button id="template-ts_bun">Bun</button></td>
                            </tr>
                            <tr>
                                <th>TypeScript (Interactive)</th>
                                <td><button id="template-ts_node_interactive">Node.js</button></td>
                                <td><button id="template-ts_deno_interactive">Deno</button></td>
                                <td><button id="template-ts_bun_interactive">Bun</button></td>
                            </tr>
                            <!--
                            <tr>
                                <th>Python3</th>
                                <td><button id="template-py3_cpy">CPython</button></td>
                            </tr>
                            <tr>
                                <th>Ruby</th>
                                <td><button id="template-rb_ruby">Ruby</button></td>
                            </tr>
                            -->
                            <tr>
                                <th>Text</th>
                                <td><button id="template-txt_cat">Text (cat)</button></td>
                            </tr>
                        </tbody>
                    </table>
                </section>
                <section class="tab-content-section" id="sect-op-submission">
                    <h2>Submission</h2>
                    <button id="button-prepare-submission">Prepare Submission</button>
                </section>
            </div>
            <div class="tab-content" id="tab-content-test">
                <section class="tab-content-section" id="sect-test-inputs">
                    <h2>Test</h2>
                    <section id="section-testcases">
                        <h3>Testcase Input</h3>
                        <textarea id="textarea-test-input" placeholder="Enter test case input here..."></textarea>
                    </section>
                    <section id="section-expected-output">
                        <h3>Expected Output</h3>
                        <textarea id="textarea-expected-output" placeholder="Enter expected output here..."></textarea>
                    </section>
                </section>
                <section class="tab-content-section" id="sect-test-controls">
                    <section id="sect-example-auto-exec">
                        <h2>Example Auto-Exec.</h2>
                        <section id="section-auto-exec-buttons">
                            <!-- <button class="button-auto-exec" data-testcase="1">1</button> -->
                        </section>
                    </section>
                    <section id="sect-test-run-testcase">
                        <button id="button-run-test">Run Test</button>
                    </section>
                    <section id="sect-test-result-status">
                        <table id="table-test-status">
                            <tbody>
                                <tr>
                                    <th>Status</th>
                                    <td><span id="span-test-status" data-color="gray">--</span></td>
                                </tr>
                                <tr>
                                    <th>Exec. Time</th>
                                    <td id="td-execution-time">---</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </section>
                <section class="tab-content-section" id="sect-test-outputs">
                    <h2>Test Result</h2>
                    <section id="section-test-actual-stdout">
                        <h3>Actual Stdout</h3>
                        <textarea id="textarea-actual-stdout" readonly></textarea>
                    </section>
                    <section id="section-test-actual-stderr">
                        <h3>Actual Stderr</h3>
                        <textarea id="textarea-actual-stderr" readonly></textarea>
                    </section>
                </section>
            </div>
            <div class="tab-content" id="tab-content-settings">
                <section class="tab-content-section" id="sect-settings">
                    <h2>Settings</h2>
                    <section class="settings-section">
                        <h3>Test</h3>
                        <ul class="settings-list">
                            <li>
                                <label for="input-settings-test-time-limit">Test Time Limit (ms)</label>
                                <input type="number" id="input-settings-test-time-limit" value="1000">
                            </li>
                            <li>
                                <label for="input-settings-allowable-error">Allowable Error</label>
                                <input type="text" id="input-settings-allowable-error" value="1e-6">
                            </li>
                        </ul>
                    </section>
                    <section class="settings-section">
                        <h3>Editor</h3>
                        <ul class="settings-list">
                            <li>
                                <label for="select-settings-editor-language">Language (IntelliSense, Syntax Highlighting)</label>
                                <select id="select-settings-editor-language">
                                    <option value="javascript">JavaScript</option>
                                    <option value="typescript">TypeScript</option>
                                    <option value="python">Python 3 (CPython)</option>
                                    <!--
                                    <option value="ruby">Ruby (ruby)</option>
                                    -->
                                    <option value="plaintext" selected>Plain Text</option>
                                </select>
                            </li>
                        </ul>
                    </section>
                </section>
            </div>
        </div>
    </div>
</div>
`;
const createDOM = (): HTMLDivElement => {
    // ちゃんとDOMParserを使ってパースする
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const container = doc.getElementById("aibp-container") as HTMLDivElement;
    return container;
};

// ----------------------------------------------------------------
// 各種イベントを設定して返す
// ----------------------------------------------------------------

export const createUI = async (): Promise<HTMLDivElement> => {
    const container = createDOM();

    // ==== 各種イベント設定 ====
    // await setupXXX(container);
    await setupTabSwitching(container);
    await setupGlobalSettingsSetter(container);
    await setupInPageSettingsSetter(container);
    const editor = await setupMonacoEditor(container);
    await setupTemplateInserter(container, editor);
    await setupExampleAutoExecButtons(container);
    await setupPrepareSubmissionButton(container, editor);
    await setupRunTestButton(container, editor);

    // ==== 返す ====
    return container;
};
