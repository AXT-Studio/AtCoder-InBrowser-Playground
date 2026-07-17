import { useEffect, useRef } from "preact/hooks";
import type { editor } from "monaco-editor";
import { foldClassDeclarations } from "./foldLines";
import { createMonacoEditor, setMonacoLanguage } from "./setup";

export type MonacoEditorProps = {
    /** mount 時の初期値のみ。以降の正本は Monaco（Signals へは onChange で片方向） */
    initialValue: string;
    language: string;
    onChange: (value: string) => void;
    class?: string;
    /** 親から Prepare Submission / Template Insert 等で editor 実体を触るとき用 */
    editorRef?: { current: editor.IStandaloneCodeEditor | null };
};

/**
 * Preact 向け Monaco ラッパ（imperative create / dispose）。
 * テキストの正本は Monaco。props から setValue で書き戻さない（#84: controlled 同期のレース回避）。
 * 外部更新（Template Insert 等）は editorRef 経由で setEditorValueExternal する。
 */
export function MonacoEditor(props: MonacoEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const onChangeRef = useRef(props.onChange);
    onChangeRef.current = props.onChange;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const instance = createMonacoEditor({
            container,
            value: props.initialValue,
            language: props.language,
            onChange: (value) => {
                onChangeRef.current(value);
            },
        });
        editorRef.current = instance;
        if (props.editorRef) {
            props.editorRef.current = instance;
        }
        foldClassDeclarations(instance, { delayMs: 100 });

        return () => {
            if (props.editorRef) {
                props.editorRef.current = null;
            }
            instance.dispose();
            editorRef.current = null;
        };
        // mount 時のみ。テキストは Monaco 正本、language は別 effect で同期
    }, []);

    useEffect(() => {
        const instance = editorRef.current;
        if (!instance) return;
        setMonacoLanguage(instance, props.language);
    }, [props.language]);

    return <div ref={containerRef} class={props.class ?? "aibp-editor__monaco"} />;
}
