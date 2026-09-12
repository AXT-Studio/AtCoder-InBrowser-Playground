import type { GenerateTemplateParams } from "../types";

const ROLE_LINE = {
    submission: "-- Lua (w/ Input scanner) [Main] Submission",
    naive: "-- Lua (w/ Input scanner) [Naive] Comparative Implementation",
    generator: "-- Lua (w/ Input scanner) [Gen] Testcase Input Generator",
} as const;

export const generateTemplate = ({ contestTitle, taskTitle, taskURL, role }: GenerateTemplateParams): string =>
    `\
-- ${contestTitle}
-- ${taskTitle}
-- (URL: ${taskURL})
${ROLE_LINE[role]}

local tokens, ti = {}, 1
for w in io.read("a"):gmatch("%S+") do
    tokens[#tokens + 1] = w
end
local function str()
    local v = tokens[ti]; ti = ti + 1; return v
end
local function int()
    local v = str()
    local n = tonumber(v)
    return math.tointeger(n) or n
end

-- Add your code here
`;
