import type { PyodideInterface } from "pyodide";
import { loadPyodide } from "pyodide";
import type { RunnerResult } from "../background/runners/types";
import {
    PYTHON_OFFSCREEN_REQUEST_TYPE,
    PYTHON_OFFSCREEN_RESPONSE_TYPE,
    type PythonOffscreenRequestMessage,
    type PythonOffscreenRequestPayload,
    type PythonOffscreenResponseMessage,
    type PythonOffscreenResponsePayload,
    type PythonOffscreenRunResponseData,
    type PythonRunnerContext,
} from "../background/runners/python/protocol";

const SUPPORTED_PYTHON_PACKAGES_PYPI = [
    "ac-library-python",
    "mpmath",
    "sympy",
    "networkx",
    "sortedcontainers",
] as const;
const SUPPORTED_PYTHON_PACKAGES_LOCAL = [
    "numpy",
    "scipy",
    "bitarray",
] as const;

const PYPI_WHEEL_URL_BY_PACKAGE = {
    mpmath:
        "https://files.pythonhosted.org/packages/43/e3/7d92a15f894aa0c9c4b49b8ee9ac9850d6e63b03c9c32c0367a13ae62209/mpmath-1.3.0-py3-none-any.whl",
    sympy:
        "https://files.pythonhosted.org/packages/99/ff/c87e0622b1dadea79d2fb0b25ade9ed98954c9033722eb707053d310d4f3/sympy-1.13.3-py3-none-any.whl",
    networkx:
        "https://files.pythonhosted.org/packages/b9/54/dd730b32ea14ea797530a4479b2ed46a6fb250f682a9cfb997e968bf0261/networkx-3.4.2-py3-none-any.whl",
    sortedcontainers:
        "https://files.pythonhosted.org/packages/32/46/9cb0e58b2deb7f82b84065f37f3bffeb12413f947f9388e4cac22c4621ce/sortedcontainers-2.4.0-py2.py3-none-any.whl",
} as const;

const pyodideMap = new Map<string, PyodideInterface>();

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const isPythonOffscreenRequestMessage = (
    message: unknown,
): message is PythonOffscreenRequestMessage => {
    if (!isObjectRecord(message)) {
        return false;
    }
    if (message.type !== PYTHON_OFFSCREEN_REQUEST_TYPE) {
        return false;
    }
    if (!isObjectRecord(message.payload)) {
        return false;
    }
    return typeof message.payload.requestId === "string";
};

const sendResponse = async (
    payload: PythonOffscreenResponsePayload,
): Promise<void> => {
    const message: PythonOffscreenResponseMessage = {
        type: PYTHON_OFFSCREEN_RESPONSE_TYPE,
        payload,
    };
    await browser.runtime.sendMessage(message);
};

const initPyodide = async (): Promise<PythonRunnerContext> => {
    const pyodide = await loadPyodide({
        indexURL: browser.runtime.getURL(
            "/assets/pyodide/" as unknown as never,
        ),
    });

    if (pyodide === null) {
        throw new Error("Failed to initialize Pyodide");
    }

    for (const pkg of SUPPORTED_PYTHON_PACKAGES_LOCAL) {
        await pyodide.loadPackage(pkg);
    }

    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");

    for (const pkg of SUPPORTED_PYTHON_PACKAGES_PYPI) {
        const wheelUrl =
            PYPI_WHEEL_URL_BY_PACKAGE[
                pkg as keyof typeof PYPI_WHEEL_URL_BY_PACKAGE
            ];
        try {
            await micropip.install(wheelUrl ?? pkg);
        } catch (error) {
            throw new Error(
                `Failed to install Python package ${pkg}: ${getErrorMessage(error)}`,
            );
        }
    }

    const pyodideInterfaceID = crypto.randomUUID();
    pyodideMap.set(pyodideInterfaceID, pyodide);

    return {
        pyodideInterfaceID,
    };
};

const runPythonCode = async (
    payload: Extract<PythonOffscreenRequestPayload, { action: "run" }>,
): Promise<PythonOffscreenRunResponseData> => {
    try {
        const pyodide = pyodideMap.get(payload.pyodideInterfaceID);
        if (!pyodide) {
            throw new Error("Runner context is missing pyodide");
        }

        const stdinLines = payload.stdin.split("\n");
        let stdinIndex = 0;
        const stdinHandler = (): string | undefined => {
            return stdinLines[stdinIndex++];
        };

        pyodide.setStdin({ stdin: stdinHandler });

        const stdout: number[] = [];
        pyodide.setStdout({
            raw: (charCode: number): void => {
                stdout.push(charCode);
            },
        });

        const stderr: number[] = [];
        pyodide.setStderr({
            raw: (charCode: number): void => {
                stderr.push(charCode);
            },
        });

        await pyodide.runPythonAsync(payload.code);

        const decoder = new TextDecoder();
        const result: Awaited<RunnerResult> = {
            status: "success",
            data: {
                stdout: decoder.decode(new Uint8Array(stdout)),
                stderr: decoder.decode(new Uint8Array(stderr)),
            },
        };
        return result;
    } catch (error) {
        const result: Awaited<RunnerResult> = {
            status: "failure",
            error: {
                errorType: "CE",
                error: getErrorMessage(error),
            },
        };
        return result;
    }
};

const handleOffscreenRequest = async (
    payload: PythonOffscreenRequestPayload,
): Promise<void> => {
    if (payload.action === "init") {
        const context = await initPyodide();
        await sendResponse({
            requestId: payload.requestId,
            ok: true,
            data: context,
        });
        return;
    }

    if (payload.action === "run") {
        const result = await runPythonCode(payload);
        await sendResponse({
            requestId: payload.requestId,
            ok: true,
            data: result,
        });
        return;
    }

    pyodideMap.delete(payload.pyodideInterfaceID);
    await sendResponse({
        requestId: payload.requestId,
        ok: true,
        data: { disposed: true },
    });
};

browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isPythonOffscreenRequestMessage(message)) {
        return;
    }

    void handleOffscreenRequest(message.payload).catch(
        async (error: unknown): Promise<void> => {
            await sendResponse({
                requestId: message.payload.requestId,
                ok: false,
                error: getErrorMessage(error),
            });
        },
    );
});
