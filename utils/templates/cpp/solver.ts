import { formatTemplateHeader } from "../formatHeader";
import type { GenerateTemplateParams } from "../types";

export const generateTemplate = ({ contestTitle, taskTitle, taskURL, role }: GenerateTemplateParams): string =>
    `\
${formatTemplateHeader({
    contestTitle,
    taskTitle,
    taskURL,
    runtimeLabel: "C++",
    role,
})}

#include <bits/stdc++.h>
#include <iostream>
using namespace std;
int main() {
    // Add your code here
    return 0;
}
`;
