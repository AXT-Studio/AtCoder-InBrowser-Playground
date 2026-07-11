import { useEffect, useRef } from "preact/hooks";
import type { editor } from "monaco-editor";
import { foldClassDeclarations } from "./foldLines";
import { createMonacoEditor, setMonacoLanguage } from "./setup";

export type MonacoEditorProps = {
    value: string;
    language: string;
    onChange: (value: string) => void;
    class?: string;
    /** 親から Prepare Submission 等で editor 実体を触るとき用 */
    editorRef?: { current: editor.IStandaloneCodeEditor | null };
};

/**
 * Preact 向け Monaco ラッパ（imperative create / dispose）。
 * value の外部更新はモデルへ同期。入力中の自分自身の onChange はループしないよう参照比較する。
 * 外部からコードが入ったときは旧実装どおり `class` 行を折る（Insert / hydrate）。
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
    }, []);

    useEffect(() => {
        const instance = editorRef.current;
        if (!instance) return;
        if (instance.getValue() !== props.value) {
            instance.setValue(props.value);
            foldClassDeclarations(instance, { delayMs: 100 });
        }
    }, [props.value]);

    useEffect(() => {
        const instance = editorRef.current;
        if (!instance) return;
        setMonacoLanguage(instance, props.language);
    }, [props.language]);

    return <div ref={containerRef} class={props.class ?? "aibp-editor__monaco"} />;
}
