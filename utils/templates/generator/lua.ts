import type { GenerateTemplateParams } from "../types";

export const generateTemplate = ({ contestTitle, taskTitle, taskURL }: GenerateTemplateParams): string =>
    `\
-- ${contestTitle}
-- ${taskTitle}
-- (URL: ${taskURL})
-- Lua [Gen] Testcase Input Generator

print(math.random(1, 100)) -- 1 <= x <= 100
`;
