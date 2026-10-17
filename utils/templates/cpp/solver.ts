import type { GenerateTemplateParams, TemplateRole } from "../types";

const ROLE_LABEL: Record<TemplateRole, string> = {
    submission: "[Main] Submission",
    compare: "[Compare] Comparative Implementation",
    generator: "[Gen] Testcase Input Generator",
};

export const generateTemplate = ({ contestTitle, taskTitle, taskURL, role }: GenerateTemplateParams): string =>
    `\
// ================================================================
// ${contestTitle}
// ${taskTitle}
// (URL: ${taskURL})
// C++ ${ROLE_LABEL[role]}
// ================================================================

#include <bits/stdc++.h>
#include <iostream>
using namespace std;
int main() {
    // Add your code here
    return 0;
}
`;
