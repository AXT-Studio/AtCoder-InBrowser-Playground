/** バッファ種別。先頭コメント行の差し替えに使う */
export type TemplateRole = "submission" | "naive" | "generator";

export type GenerateTemplateParams = {
    contestTitle: string;
    taskTitle: string;
    taskURL: string;
    role: TemplateRole;
};

export type TemplateGenerator = (params: GenerateTemplateParams) => string;

export type TemplateKind = "solver" | "generator";

export type TemplateLanguage = "typescript" | "javascript";

export type TemplateDefinition = {
    id: string;
    label: string;
    language: TemplateLanguage;
    kind: TemplateKind;
    generate: TemplateGenerator;
};
