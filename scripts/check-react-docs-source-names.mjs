import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = [
  "docs",
  "packages/wire-react/README.md"
];

const docNamePattern = /^(REACT_|WIRE_OPTIONS_CATALOG_SPEC|.*react.*\.md$)/i;
const blockedTokens = [
  ["x", "y", "flow"].join(""),
  ["react", " ", "flow"].join(""),
  ["react", "-", "flow"].join("")
];

let failed = false;
for (const file of filesForRoots(roots)) {
  const text = readFileSync(file, "utf8");
  const normalized = text.toLowerCase();
  if (/https?:\/\//i.test(text)) {
    console.error(`External URL found in ${file}`);
    failed = true;
  }
  for (const token of blockedTokens) {
    if (normalized.includes(token)) {
      console.error(`External source-name reference found in ${file}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);

function filesForRoots(paths) {
  const files = [];
  for (const path of paths) {
    const stats = statSync(path);
    if (stats.isFile()) {
      files.push(path);
      continue;
    }
    collect(path, files);
  }
  return files.filter((file) => file.endsWith(".md") && (file.startsWith("packages/wire-react/") || docNamePattern.test(file.split("/").at(-1) ?? "")));
}

function collect(dir, files) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) collect(path, files);
    else if (stats.isFile()) files.push(path);
  }
}
