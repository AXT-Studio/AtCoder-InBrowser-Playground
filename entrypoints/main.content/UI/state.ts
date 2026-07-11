import { signal } from "@preact/signals";
import { parseAllowableError } from "@/utils/atcoder/parseAllowableError";
import { parseTimeLimit } from "@/utils/atcoder/parseTimeLimit";

export type Mode = "solve" | "compare" | "stress";
export const mode = signal<Mode>("solve");

/** 提出用コード（Prepare Submission の対象）。mode 切替でも保持する */
export const submissionCode = signal("");

/**
 * ページロード時に DOM から一度だけ初期化した TL / eps。
 * 各 mode の欄が同じ signal を参照する（タブ切替で再パースしない）。
 */
export const timeLimitMs = signal(parseTimeLimit());
export const epsExponent = signal(parseAllowableError());
