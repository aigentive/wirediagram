import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const denylist = JSON.parse(readFileSync("scripts/docs-source-name-denylist.json", "utf8"));
const blockedTokens = denylist.tokens.map((token) => Array.isArray(token) ? token.join("") : String(token));
const allowedUrlPatterns = denylist.allowedUrlPatterns.map((pattern) => new RegExp(pattern, "i"));

const targetRoots = [
  "README.md",
  "docs",
  "packages/wire-react/README.md",
  "packages/wire-react/src",
  "apps/playground/app",
  "packages/wire-mcp/src/docs-shape.ts"
];

const targetExtensions = new Set([".md", ".mdx", ".ts", ".tsx"]);
const excludedPathParts = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".next",
  "out",
  "build",
  ".cache",
  "test-results",
  "playwright-report"
]);

let failed = false;
for (const file of trackedTargetFiles()) {
  const text = readFileSync(file, "utf8");
  const haystacks = [
    normalizeForTokenMatch(text),
    normalizeForTokenMatch(file),
    compactForTokenMatch(text),
    compactForTokenMatch(file)
  ];

  for (const token of blockedTokens) {
    const normalizedToken = normalizeForTokenMatch(token);
    const compactToken = compactForTokenMatch(token);
    if (haystacks.includes(normalizedToken) || haystacks.some((haystack) => haystack.includes(normalizedToken))) {
      report(`External source-name reference found in ${file}`);
    } else if (compactToken && haystacks.some((haystack) => haystack.includes(compactToken))) {
      report(`External source-name reference found in ${file}`);
    }
  }

  for (const url of text.match(/https?:\/\/[^\s'"`)<>]+/gi) ?? []) {
    if (!allowedUrlPatterns.some((pattern) => pattern.test(url))) {
      report(`External URL found in ${file}`);
    }
  }
}

if (failed) process.exit(1);

function trackedTargetFiles() {
  const tracked = trackedFiles();
  return tracked
    .filter((file) => targetRoots.some((root) => file === root || file.startsWith(`${root}/`)))
    .filter((file) => !hasExcludedPathPart(file))
    .filter((file) => targetExtensions.has(extensionFor(file)) || file === "README.md");
}

function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files", ...targetRoots], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .sort();
  } catch {
    return targetRoots.flatMap((root) => collectFiles(root)).sort();
  }
}

function collectFiles(path) {
  if (!existsSync(path)) return [];
  const stats = statSync(path);
  if (stats.isFile()) return [relative(process.cwd(), path)];
  const files = [];
  for (const entry of readdirSync(path)) {
    files.push(...collectFiles(join(path, entry)));
  }
  return files;
}

function hasExcludedPathPart(file) {
  return file.split(/[\\/]/).some((part) => excludedPathParts.has(part));
}

function extensionFor(file) {
  const index = file.lastIndexOf(".");
  return index === -1 ? "" : file.slice(index);
}

function normalizeForTokenMatch(value) {
  return value.toLowerCase().replace(/[\s._/:-]+/g, " ").trim();
}

function compactForTokenMatch(value) {
  return value.toLowerCase().replace(/[\s._/:-]+/g, "");
}

function report(message) {
  console.error(message);
  failed = true;
}
