export type RunnerResult = Promise<
    Result<{ stdout: string; stderr: string }, { errorType: "RE" | "CE"; error: string }>
>;

export type RunnerContext = Record<string, unknown>;

export type Runner<T extends RunnerContext = RunnerContext> = (arg0: {
    context: T;
    code: string;
    stdin: string;
}) => RunnerResult;
