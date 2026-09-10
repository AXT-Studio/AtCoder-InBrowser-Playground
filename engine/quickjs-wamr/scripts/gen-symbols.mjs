import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const interfaceFile = path.join(here, "../src/interface.c");
const dest = process.argv[2] ?? path.join(here, "../build/symbols.json");
const src = fs.readFileSync(interfaceFile, "utf8");
const re = /^[\w()* ]+[\s*]+(QTS_\w+)\((.*?)\) ?\{/gm;
const names = [];
for (const match of src.matchAll(re)) {
    names.push(`_${match[1]}`);
}
const unique = [...new Set(names), "_malloc", "_free"];
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, `${JSON.stringify(unique)}\n`);
console.log(`wrote ${unique.length} symbols to ${dest}`);
