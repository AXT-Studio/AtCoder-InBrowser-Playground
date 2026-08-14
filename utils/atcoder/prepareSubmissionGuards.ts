export const WARNING_MESSAGE_ON_DFS_AND_BUN = `\
警告: Bun環境で再帰DFSをしようとしていませんか？コールスタック超過によりペナルティ(Runtime Error)を受ける可能性があります。続行しますか？
Warning: Are you trying to do recursive DFS in the Bun environment? You may get a penalty (Runtime Error) due to stack overflow. Do you want to proceed?
`;

const DFS_DECLARATION_RE = /(?:(?:const|let)\s+dfs\s*=|function\s+dfs\b)/;

export const shouldWarnDfsAndBun = (code: string): boolean => DFS_DECLARATION_RE.test(code) && code.includes("Bun.");
