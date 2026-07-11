import type { StartMessage, ReadyMessage, ResultMessage } from "../types";
import { languages } from "../languages";

self.onmessage = async (event: MessageEvent<StartMessage>) => {
    const { id, language, code, stdin } = event.data;
    try {
        const langModule = languages[language];
        if (!langModule) {
            throw new Error(`Language module not found: ${language}`);
        }
        const ctx = await langModule.init();
        self.postMessage({ type: "ready", id } satisfies ReadyMessage);
        try {
            const outcome = await langModule.run(ctx, code, stdin);
            self.postMessage({ type: "result", id, result: outcome } satisfies ResultMessage);
        } catch (error) {
            self.postMessage({
                type: "result",
                id,
                result: { status: "RE", stdout: "", stderr: String(error) },
            } satisfies ResultMessage);
        }
    } catch (error) {
        self.postMessage({
            type: "result",
            id,
            result: { status: "CE", stdout: "", stderr: String(error) },
        } satisfies ResultMessage);
    }
};
