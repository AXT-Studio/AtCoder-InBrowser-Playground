import type { BufferKind } from "@/utils/persistence/editorBuffers";

/** バッファごとの安定 URI。extraLib (`file:///aibp-runtime.d.ts`) と衝突しない */
export const bufferModelUri = (kind: BufferKind): string => `file:///aibp/buffer/${kind}`;

/** viewState が無い初回 attach だけ class 折りを走らせる */
export const shouldAutoFoldClasses = (hasViewState: boolean): boolean => !hasViewState;
