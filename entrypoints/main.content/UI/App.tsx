import { useEffect } from "preact/hooks";
import "./fonts";
import "./App.css";
import "./controls.css";
import { editorBuffersHydrated, hydrateEditorBuffers, mode } from "./state";
import { Solve } from "./modes/Solve";
import { Compare } from "./modes/Compare";
import { Stress } from "./modes/Stress";

export function App() {
    useEffect(() => {
        void hydrateEditorBuffers();
    }, []);

    return (
        <div class="aibp-panel">
            <div class="aibp-panel__chrome">
                <header class="aibp-toolbar">
                    <nav class="aibp-mode-tabs" role="tablist" aria-label="Mode">
                        <button
                            type="button"
                            role="tab"
                            id="aibp-tab-solve"
                            aria-selected={mode.value === "solve"}
                            aria-controls="aibp-panel-solve"
                            onClick={() => (mode.value = "solve")}
                        >
                            Solve
                        </button>
                        <button
                            type="button"
                            role="tab"
                            id="aibp-tab-compare"
                            aria-selected={mode.value === "compare"}
                            aria-controls="aibp-panel-compare"
                            onClick={() => (mode.value = "compare")}
                        >
                            Compare
                        </button>
                        <button
                            type="button"
                            role="tab"
                            id="aibp-tab-stress"
                            aria-selected={mode.value === "stress"}
                            aria-controls="aibp-panel-stress"
                            onClick={() => (mode.value = "stress")}
                        >
                            Stress
                        </button>
                    </nav>
                </header>
                <main class="aibp-panel__body">
                    {/* storage 読み込み前に編集すると上書きレースになるので待つ */}
                    {editorBuffersHydrated.value && mode.value === "solve" && (
                        <section
                            id="aibp-panel-solve"
                            role="tabpanel"
                            aria-labelledby="aibp-tab-solve"
                            class="aibp-mode-view"
                        >
                            <Solve />
                        </section>
                    )}
                    {editorBuffersHydrated.value && mode.value === "compare" && (
                        <section
                            id="aibp-panel-compare"
                            role="tabpanel"
                            aria-labelledby="aibp-tab-compare"
                            class="aibp-mode-view"
                        >
                            <Compare />
                        </section>
                    )}
                    {editorBuffersHydrated.value && mode.value === "stress" && (
                        <section
                            id="aibp-panel-stress"
                            role="tabpanel"
                            aria-labelledby="aibp-tab-stress"
                            class="aibp-mode-view"
                        >
                            <Stress />
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}
