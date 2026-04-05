import type { RunnerResult } from "../types";

export type PythonRunnerContext = {
    pyodideInterfaceID: string;
};

export const PYTHON_OFFSCREEN_REQUEST_TYPE = "mv3-python-runner-request";
export const PYTHON_OFFSCREEN_RESPONSE_TYPE = "mv3-python-runner-response";
export const MV3_PYTHON_RUNNER_DOCUMENT_PATH = "mv3_python_runner.html";

export type PythonOffscreenRequestPayload =
    | {
          requestId: string;
          action: "init";
      }
    | {
          requestId: string;
          action: "run";
          pyodideInterfaceID: string;
          code: string;
          stdin: string;
      }
    | {
          requestId: string;
          action: "dispose";
          pyodideInterfaceID: string;
      };

type RemoveRequestId<T> = T extends { requestId: string } ? Omit<T, "requestId"> : never;

export type PythonOffscreenRequestPayloadWithoutRequestId =
    RemoveRequestId<PythonOffscreenRequestPayload>;

export type PythonOffscreenRunResponseData = Awaited<RunnerResult>;

export type PythonOffscreenResponsePayload =
    | {
          requestId: string;
          ok: true;
          data: PythonRunnerContext | PythonOffscreenRunResponseData | { disposed: true };
      }
    | {
          requestId: string;
          ok: false;
          error: string;
      };

export type PythonOffscreenRequestMessage = {
    type: typeof PYTHON_OFFSCREEN_REQUEST_TYPE;
    payload: PythonOffscreenRequestPayload;
};

export type PythonOffscreenResponseMessage = {
    type: typeof PYTHON_OFFSCREEN_RESPONSE_TYPE;
    payload: PythonOffscreenResponsePayload;
};
