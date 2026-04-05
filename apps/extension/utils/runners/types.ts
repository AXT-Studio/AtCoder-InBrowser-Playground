import type { PyodideInterface } from "pyodide";
import type { QuickJSContext } from "quickjs-emscripten-core";

export type CodeTestContext = {
    // biome-ignore lint/complexity/noBannedTypes: plaintextでは空のオブジェクトを返してほしいので許容
    plaintext: {};
    typescript: {
        quickJsVm: QuickJSContext;
    };
    python: {
        pyodide: PyodideInterface;
    };
};
