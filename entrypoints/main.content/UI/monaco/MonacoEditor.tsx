import { useEffect, useRef } from "preact/hooks";
import type { editor } from "monaco-editor";
import { createMonacoEditor, setMonacoLanguage } from "./setup";

export type MonacoEditorProps = {
    value: string;
    language: string;
    onChange: (value: string) => void;
    class?: string;
};

/**
 * Preact 向け Monaco ラッパ（imperative create / dispose）。
 * value の外部更新はモデルへ同期。入力中の自分自身の onChange はループしないよう参照比較する。
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
            value: props.value,
            language: props.language,
            onChange: (value) => {
                onChangeRef.current(value);
            },
        });
        editorRef.current = instance;

        return () => {
            instance.dispose();
            editorRef.current = null;
        };
    }, []);

    useEffect(() => {
        const instance = editorRef.current;
        if (!instance) return;
        if (instance.getValue() !== props.value) {
            instance.setValue(props.value);
        }
    }, [props.value]);

    useEffect(() => {
        const instance = editorRef.current;
        if (!instance) return;
        setMonacoLanguage(instance, props.language);
    }, [props.language]);

    return <div ref={containerRef} class={props.class ?? "aibp-editor__monaco"} />;
}
