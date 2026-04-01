// ================================================================================================
// Runner Module: Python
// ================================================================================================

// ----------------------------------------------------------------
// imports
// ----------------------------------------------------------------

import type { Runner } from "../types";
import type { PythonRunnerContext } from "./protocol";
import { init as firefoxInit, run as firefoxRun } from "./firefox";
import { init as chromeInit, run as chromeRun } from "./chrome";


// ----------------------------------------------------------------
// 環境判定
// ----------------------------------------------------------------

const manifestVersion = import.meta.env.MANIFEST_VERSION;

// ----------------------------------------------------------------
// init()
// コード実行に必要な初期化処理を行い、Contextを返す。
// ----------------------------------------------------------------

export const init = async (): Promise<PythonRunnerContext> => {
    if (manifestVersion === 2) {
    // ==== Firefox(MV2)の場合はFirefox用の初期化処理をそのまま実行すればOK ====
        return firefoxInit();
    } else {
    // ==== Chrome(MV3)の場合は、Unlisted Page(`/mv3_python_runner.html`)と通信してPyodideを初期化する ====
        return chromeInit();
    }
};

// ----------------------------------------------------------------
// run()
// Contextを用いてコードを実行し、結果を返す。
// ----------------------------------------------------------------

export const run: Runner<PythonRunnerContext> = async (
    { context, code, stdin },
) => {
    if (manifestVersion === 2) {
        // ==== Firefox(MV2)の場合はFirefox用の実行処理をそのまま実行すればOK ====
        return firefoxRun({ context, code, stdin });
    } else {
        // ==== Chrome(MV3)の場合は、Unlisted Page(`/mv3_python_runner.html`)と通信してコードを実行する ====
        return chromeRun({ context, code, stdin });
    }
};

// ----------------------------------------------------------------
// export
// ----------------------------------------------------------------
export default { init, run };
