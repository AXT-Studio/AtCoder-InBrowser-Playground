/** テストケース実行結果 */
export type CodeTestResult = {
    status: "completed" | "TLE" | "RE" | "CE";
    execTime: number; // ミリ秒。CE は -1（AtCoder ジャッジに寄せる）
    stdout: string;
    stderr: string; // RE / CE のエラー理由もここ。TLE 時は "Time Limit Exceeded." のようにする
};

/** Language ModuleがRunner Workerに返す実行結果情報 */
export type LanguageRunOutcome = {
    status: "completed" | "RE" | "CE";
    stdout: string;
    stderr: string;
};
/** Language Moduleのインターフェース */
export type LanguageModule<Ctx> = {
    init(): Promise<Ctx>;
    run(ctx: Ctx, code: string, stdin: string): Promise<LanguageRunOutcome>;
};

export type ExecRequestMessage = {
    type: "execRequest";
    id: string;
    language: string;
    code: string;
    stdin: string;
    timeLimitMs: number;
};
export type StartMessage = {
    type: "start";
    id: string;
    language: string;
    code: string;
    stdin: string;
};
export type ReadyMessage = {
    type: "ready";
    id: string;
};
export type ResultMessage = {
    type: "result";
    id: string;
    result: LanguageRunOutcome;
};
export type ExecResponseMessage = {
    type: "execResponse";
    id: string;
    codeTestResult: CodeTestResult;
};
