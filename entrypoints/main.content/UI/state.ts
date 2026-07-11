import { signal } from "@preact/signals";

export type Mode = "solve" | "compare" | "stress";
export const mode = signal<Mode>("solve");
