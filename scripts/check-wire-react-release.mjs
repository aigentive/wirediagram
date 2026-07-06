import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];

const commands = {
  "consumer-pack": checkConsumerPack,
  "legacy-utility-consumer": checkLegacyUtilityConsumer,
  "api-compat": checkApiCompat,
  "docs-links": checkDocsLinks,
  "docs-snippets": checkDocsSnippets,
  "docs-agent-skill": checkDocsAgentSkill,
  "persistence": checkPersistence,
  "release-notes": checkReleaseNotes,
  "semver": checkSemver,
  "registry-version": checkRegistryVersion,
  "workspace-ranges": checkWorkspaceRanges,
  "lockfile": checkLockfile,
  "api-diff": checkApiDiff,
  "release-dry-run": checkReleaseDryRun
};

if (!command || !commands[command]) {
  console.error(`Usage: node scripts/check-wire-react-release.mjs <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}

await commands[command]();

async function checkConsumerPack() {
  const fixtureDir = prepareConsumerFixture();
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: fixtureDir });
  run("npm", ["exec", "tsc", "--", "--noEmit", "-p", "tsconfig.json"], { cwd: fixtureDir });
  run("npm", ["exec", "vite", "--", "build", "--logLevel", "warn"], { cwd: fixtureDir });
  const bundleDir = join(fixtureDir, "dist", "assets");
  const bundle = readdirSync(bundleDir).find((file) => file.endsWith(".js"));
  if (!bundle) throw new Error("Packed consumer did not produce a JavaScript bundle.");
  const source = readFileSync(join(bundleDir, bundle), "utf8");
  if (!source.includes("wire-canvas")) throw new Error("Packed consumer bundle does not include wire-react rendered surfaces.");
}

async function checkLegacyUtilityConsumer() {
  const fixtureDir = prepareConsumerFixture();
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: fixtureDir });
  run("npm", ["exec", "tsc", "--", "--noEmit", "-p", "tsconfig.legacy.json"], { cwd: fixtureDir });
}

function checkApiCompat() {
  ensureBuiltDeclaration();
  const source = declarationFiles(resolve(rootDir, "packages/wire-react/dist"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const requiredNames = [
    "WireOptionSpec",
    "WireOptionCatalog",
    "WireInspector",
    "WireWorkspace",
    "WireCanvas",
    "WireProvider",
    "WireEditor",
    "WireViewer",
    "WireToolbar",
    "WirePalette",
    "WireNodeList",
    "WireValidationPanel",
    "WireNodeCardView",
    "WireGroupFrame"
  ];
  const missing = requiredNames.filter((name) => !source.includes(name));
  if (missing.length > 0) throw new Error(`Missing public declaration names: ${missing.join(", ")}`);
  assertNoVersionedNames(source, "wire-react declarations");
}

function checkDocsLinks() {
  const docs = markdownFiles(resolve(rootDir, "docs"));
  const failures = [];
  for (const file of docs) {
    const source = readFileSync(file, "utf8");
    const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
    for (const match of source.matchAll(linkPattern)) {
      const rawTarget = match[1].trim();
      if (!rawTarget || rawTarget.startsWith("#") || /^[a-z]+:/i.test(rawTarget)) continue;
      const target = rawTarget.split("#")[0];
      if (!target) continue;
      const resolved = resolve(dirname(file), target);
      if (!existsSync(resolved)) failures.push(`${relative(file)} -> ${rawTarget}`);
    }
  }
  if (failures.length > 0) throw new Error(`Broken docs links:\n${failures.join("\n")}`);
}

function checkDocsSnippets() {
  const components = readFileSync(resolve(rootDir, "docs/REACT_COMPONENTS.md"), "utf8");
  const packageReadme = readFileSync(resolve(rootDir, "packages/wire-react/README.md"), "utf8");
  const rootReadme = readFileSync(resolve(rootDir, "README.md"), "utf8");
  const installDocs = readFileSync(resolve(rootDir, "apps/playground/app/docs/install/page.tsx"), "utf8");
  for (const expected of [
    "@aigentive/wire-react/styles.css",
    "colorMode",
    "unstyled",
    "classNames",
    "WireOptionCatalog",
    "WireCanvas"
  ]) {
    if (!components.includes(expected)) throw new Error(`React components docs missing ${expected}.`);
  }
  for (const [label, source] of [
    ["wire-react README", packageReadme],
    ["root README", rootReadme],
    ["install docs", installDocs]
  ]) {
    if (!source.includes("@aigentive/wire-react/styles.css")) {
      throw new Error(`${label} missing package stylesheet import guidance.`);
    }
    if (/point\s+\w+\s+at\s+the\s+package\s+source|@source\s+["'][^"']*@aigentive\/wire-react/i.test(source)) {
      throw new Error(`${label} still requires utility-class source scanning.`);
    }
  }
  for (const file of [
    "apps/playground/app/docs/examples/package-css/page.tsx",
    "apps/playground/app/docs/examples/custom-shell/page.tsx",
    "apps/playground/app/docs/examples/options/page.tsx",
    "apps/playground/app/docs/examples/controlled-state/page.tsx",
    "apps/playground/app/docs/examples/edge-inspection/page.tsx",
    "apps/playground/app/docs/examples/accessibility/page.tsx",
    "apps/playground/app/docs/examples/theming/page.tsx",
    "apps/playground/app/docs/examples/wrappers/page.tsx",
    "apps/playground/app/docs/examples/read-only-inspector/page.tsx"
  ]) {
    if (!existsSync(resolve(rootDir, file))) throw new Error(`Missing React docs example ${file}.`);
  }
  assertNoVersionedOptionNames(components, "React components docs");
  assertNoVersionedOptionNames(packageReadme, "wire-react README");
  assertNoVersionedOptionNames(rootReadme, "root README");
  assertNoVersionedOptionNames(installDocs, "install docs");
}

function checkDocsAgentSkill() {
  const docsShape = readFileSync(resolve(rootDir, "packages/wire-mcp/src/docs-shape.ts"), "utf8");
  const serverSource = readFileSync(resolve(rootDir, "packages/wire-mcp/src/server.ts"), "utf8");
  const skill = readFileSync(resolve(rootDir, "docs/llm/SKILL.md"), "utf8");
  const llmReadme = readFileSync(resolve(rootDir, "docs/llm/README.md"), "utf8");
  const manifest = readJson("docs/examples/manifest.json");

  for (const expected of [
    "WireDiagram",
    "WireAction",
    "@aigentive/wire-react/styles.css",
    "WireProvider",
    "WireCanvas",
    "WireWorkspace",
    "WireInspector",
    "WireOptionSpec",
    "WireOptionCatalog",
    "WireOptionPanel",
    "WireEditor",
    "WireViewer",
    "colorMode",
    "unstyled",
    "classNames",
    "Tailwind"
  ]) {
    if (!skill.includes(expected)) throw new Error(`SKILL.md missing ${expected}.`);
  }

  const requiredTopics = ["agent", "mcp", "cli", "react", "cloud", "schema", "validation", "examples", "recipes", "skill"];
  for (const topic of requiredTopics) {
    if (!docsShape.includes(`| "${topic}"`)) throw new Error(`docs shape missing WireDocsTopic ${topic}.`);
  }
  if (!serverSource.includes("agent, mcp, cli, react, cloud, schema, validation, examples, recipes, skill")) {
    throw new Error("MCP docs shape input description missing cli/skill topics.");
  }

  const requiredRoutes = [
    "/llm/wire-docs.shape.json",
    "/llm/agent-guide.md",
    "/llm/mcp.shape.json",
    "/llm/cli.shape.json",
    "/llm/react.shape.json",
    "/llm/cloud.shape.json",
    "/llm/validation.shape.json",
    "/llm/skill.shape.json",
    "/llm/schema/wire-diagram.json"
  ];
  for (const route of requiredRoutes) {
    if (!docsShape.includes(route)) throw new Error(`docs shape missing route ${route}.`);
    if (!llmReadme.includes(route)) throw new Error(`LLM README missing route ${route}.`);
    const routeFile = routeToAppFile(route);
    if (routeFile && !existsSync(resolve(rootDir, routeFile))) {
      throw new Error(`Missing app LLM route file for ${route}: ${routeFile}.`);
    }
  }

  const requiredRecipes = [
    "create-wire-diagram",
    "edit-with-wire-actions",
    "validate-and-repair",
    "render-for-review",
    "style-cards-and-edges",
    "branch-condition-flow",
    "group-nodes",
    "embed-react-viewer"
  ];
  for (const id of requiredRecipes) {
    if (!docsShape.includes(`"${id}"`)) throw new Error(`docs shape missing recipe ${id}.`);
    if (!skill.includes(id.replaceAll("-", " ").split(" ").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ").split(" ")[0]) && id !== "embed-react-viewer") {
      throw new Error(`SKILL.md may not cover recipe ${id}.`);
    }
    if (!llmReadme.includes(`/llm/recipes/${id}.json`)) throw new Error(`LLM README missing recipe route ${id}.`);
  }

  const validationSource = readFileSync(resolve(rootDir, "packages/wire-core/src/validate.ts"), "utf8");
  const validationCodes = [...new Set([...validationSource.matchAll(/code:\s*"([^"]+)"/g)].map((match) => match[1]))].sort();
  for (const code of validationCodes) {
    if (!docsShape.includes(`code: "${code}"`)) throw new Error(`docs shape missing validation code ${code}.`);
  }

  if (!Array.isArray(manifest) || manifest.length < 12) throw new Error("docs/examples/manifest.json must contain documented examples.");
  const seenIds = new Set();
  for (const entry of manifest) {
    if (!entry.id || seenIds.has(entry.id)) throw new Error(`Invalid or duplicate examples manifest id ${entry.id}.`);
    seenIds.add(entry.id);
    if (!entry.file || !existsSync(resolve(rootDir, entry.file))) throw new Error(`Manifest entry ${entry.id} missing file ${entry.file}.`);
    if (!entry.route?.startsWith("/docs/examples")) throw new Error(`Manifest entry ${entry.id} route must be under /docs/examples.`);
    if (!Array.isArray(entry.apis) || entry.apis.length === 0) throw new Error(`Manifest entry ${entry.id} must list APIs.`);
    if (!Array.isArray(entry.renderModes) || entry.renderModes.length === 0) throw new Error(`Manifest entry ${entry.id} must list render modes.`);
  }
  for (const requiredId of ["package-css", "custom-shell", "options", "controlled-state", "edge-inspection"]) {
    if (!seenIds.has(requiredId)) throw new Error(`examples manifest missing ${requiredId}.`);
  }

  assertNoVersionedPublicApiNames(skill, "SKILL.md");
  assertNoVersionedPublicApiNames(docsShape, "LLM docs shape");
  assertNoExternalHostNames(skill, "SKILL.md");
  assertNoExternalHostNames(docsShape, "LLM docs shape");
  assertNoExternalHostNames(llmReadme, "LLM README");
}

async function checkPersistence() {
  const { parseWireDiagram, validate } = await wireCoreApi();
  const fixtureDir = resolve(rootDir, "tests/fixtures/wire-diagrams-historical");
  if (!existsSync(fixtureDir)) throw new Error("Missing historical wire diagram fixtures.");
  for (const file of readdirSync(fixtureDir)) {
    if (!file.endsWith(".json")) continue;
    const diagram = parseWireDiagram(JSON.parse(readFileSync(join(fixtureDir, file), "utf8")));
    const result = validate(diagram);
    if (!result.valid) throw new Error(`${file} does not validate: ${JSON.stringify(result.issues)}`);
    const serialized = JSON.parse(JSON.stringify(diagram));
    for (const forbidden of ["selection", "viewport", "mode", "dirty", "inspectNodeId", "inspectEdgeId", "optionCatalog"]) {
      if (forbidden in serialized) throw new Error(`${file} persisted transient field ${forbidden}.`);
    }
  }
}

function checkReleaseNotes() {
  const version = wireReactPackage().version;
  const path = resolve(rootDir, `docs/releases/wire-react-${version}.md`);
  if (!existsSync(path)) throw new Error(`Missing release notes ${relative(path)}.`);
  const source = readFileSync(path, "utf8");
  for (const expected of [
    `@aigentive/wire-react ${version}`,
    "@aigentive/wire-react/styles.css",
    "WireCanvas",
    "WireWorkspace",
    "fit selection",
    "browser performance"
  ]) {
    if (!source.includes(expected)) throw new Error(`Release notes missing ${expected}.`);
  }
  assertNoVersionedNames(source, "release notes");
}

function checkSemver() {
  const root = rootPackage();
  const wireReact = wireReactPackage();
  if (root.version !== wireReact.version) throw new Error(`Root version ${root.version} must match wire-react ${wireReact.version}.`);
  if (wireReact.version !== "1.1.0") throw new Error(`Expected @aigentive/wire-react version 1.1.0, got ${wireReact.version}.`);
  if (!wireReact.exports?.["./styles.css"]) throw new Error("styles.css export is required for the minor release.");
  assertNoVersionedNames(JSON.stringify(wireReact), "wire-react package metadata");
}

function checkRegistryVersion() {
  const pkg = wireReactPackage();
  const registry = pkg.publishConfig?.registry ?? "https://registry.npmjs.org/";
  try {
    execFileSync("npm", ["view", `${pkg.name}@${pkg.version}`, "version", `--registry=${registry}`], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe"
    });
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    if (output.includes("E404") || output.includes("No match found")) return;
    throw new Error(`Registry uniqueness check failed for ${pkg.name}@${pkg.version}:\n${output}`);
  }
  throw new Error(`${pkg.name}@${pkg.version} already exists on ${registry}.`);
}

function checkWorkspaceRanges() {
  const version = wireReactPackage().version;
  const playground = readJson("apps/playground/package.json");
  if (playground.dependencies?.["@aigentive/wire-react"] !== `^${version}`) {
    throw new Error(`apps/playground must depend on @aigentive/wire-react ^${version}.`);
  }
}

function checkLockfile() {
  const version = wireReactPackage().version;
  const lock = readJson("package-lock.json");
  if (lock.version !== rootPackage().version) throw new Error("Root package-lock version is out of sync.");
  if (lock.packages?.["packages/wire-react"]?.version !== version) throw new Error("wire-react lockfile package version is out of sync.");
  if (lock.packages?.["apps/playground"]?.dependencies?.["@aigentive/wire-react"] !== `^${version}`) {
    throw new Error("playground lockfile dependency range is out of sync.");
  }
}

function checkApiDiff() {
  checkApiCompat();
  const pack = JSON.parse(run("npm", ["pack", "--workspace", "@aigentive/wire-react", "--dry-run", "--json"], { capture: true }));
  const files = new Set(pack[0]?.files?.map((file) => file.path) ?? []);
  for (const required of ["dist/index.js", "dist/index.d.ts", "dist/styles.css", "README.md"]) {
    if (!files.has(required)) throw new Error(`Packed wire-react tarball missing ${required}.`);
  }
}

async function checkReleaseDryRun() {
  const steps = [
    ["npm", ["run", "build"]],
    ["npm", ["run", "test:react"]],
    ["npm", ["run", "test:docs-source-names"]],
    ["npm", ["run", "test:docs-links"]],
    ["npm", ["run", "test:docs-snippets"]],
    ["npm", ["run", "test:docs-agent-skill"]],
    ["npm", ["run", "build:playground"]],
    ["npm", ["run", "test:persistence"]],
    ["npm", ["run", "test:performance"]],
    ["npm", ["run", "test:api-compat"]],
    ["npm", ["run", "test:legacy-utility-consumer"]],
    ["npm", ["run", "test:consumer-pack"]],
    ["npm", ["run", "test:release-notes"]],
    ["npm", ["run", "check:workspace-ranges"]],
    ["npm", ["run", "check:lockfile"]],
    ["npm", ["run", "check:api-diff"]],
    ["npm", ["run", "check:semver"]],
    ["npm", ["run", "check:registry-version"]],
    ["npm", ["pack", "--workspace", "@aigentive/wire-react", "--dry-run"]]
  ];
  for (const [bin, args] of steps) run(bin, args);
}

function prepareConsumerFixture() {
  run("npm", ["run", "build:core"]);
  run("npm", ["run", "build", "--workspace", "@aigentive/wire-react"]);
  const tempRoot = mkdtempSync(join(tmpdir(), "wire-react-consumer-"));
  const fixtureDir = join(tempRoot, "fixture");
  cpSync(resolve(rootDir, "tests/fixtures/wire-react-consumer"), fixtureDir, { recursive: true });
  const packDir = join(tempRoot, "packs");
  mkdirSync(packDir, { recursive: true });
  const coreTgz = packWorkspace("@aigentive/wire-core", packDir);
  const reactTgz = packWorkspace("@aigentive/wire-react", packDir);
  writeFileSync(join(fixtureDir, "package.json"), `${JSON.stringify({
    name: "wire-react-consumer-fixture",
    version: "0.0.0",
    private: true,
    type: "module",
    dependencies: {
      "@aigentive/wire-core": `file:${coreTgz}`,
      "@aigentive/wire-react": `file:${reactTgz}`,
      "@types/react": "18.3.12",
      "@types/react-dom": "18.3.1",
      "react": "18.3.1",
      "react-dom": "18.3.1",
      "typescript": "5.7.3",
      "vite": "7.3.6"
    }
  }, null, 2)}\n`);
  return fixtureDir;
}

function packWorkspace(workspace, packDir) {
  const output = run("npm", ["pack", "--workspace", workspace, "--pack-destination", packDir, "--silent"], { capture: true }).trim();
  return join(packDir, basename(output.split(/\r?\n/).at(-1)));
}

function ensureBuiltDeclaration() {
  const declaration = resolve(rootDir, "packages/wire-react/dist/index.d.ts");
  if (!existsSync(declaration)) run("npm", ["run", "build", "--workspace", "@aigentive/wire-react"]);
}

function assertNoVersionedNames(source, label) {
  const forbidden = /\b(WireOption(?:Catalog|Spec)?(?:V2|Next|Pro)|V2|Next|Pro)\b/;
  if (forbidden.test(source)) throw new Error(`${label} includes forbidden versioned naming.`);
}

function assertNoVersionedOptionNames(source, label) {
  const forbidden = /\bWireOption(?:Catalog|Spec)?(?:V2|Next|Pro)\b/;
  if (forbidden.test(source)) throw new Error(`${label} includes forbidden versioned option/catalog naming.`);
}

function assertNoVersionedPublicApiNames(source, label) {
  const publicApi = [
    "WireProvider",
    "WireCanvas",
    "WireWorkspace",
    "WireInspector",
    "WireOptionSpec",
    "WireOptionCatalog",
    "WireOptionPanel",
    "WireEditor",
    "WireViewer",
    "WireDiagram",
    "WireAction"
  ].join("|");
  const forbidden = new RegExp(`\\b(?:${publicApi})(?:V2|Next|Pro)\\b|@aigentive\\/wire(?:-react)?(?:-v2|-next|-pro)\\b`, "i");
  if (forbidden.test(source)) throw new Error(`${label} includes forbidden versioned public API naming.`);
}

function assertNoExternalHostNames(source, label) {
  const forbidden = /\b(Claude|Cursor)\b/i;
  if (forbidden.test(source)) throw new Error(`${label} includes external MCP host names.`);
}

function routeToAppFile(route) {
  const routeMap = {
    "/llm/wire-docs.shape.json": "apps/playground/app/llm/wire-docs.shape.json/route.ts",
    "/llm/agent-guide.md": "apps/playground/app/llm/agent-guide.md/route.ts",
    "/llm/mcp.shape.json": "apps/playground/app/llm/mcp.shape.json/route.ts",
    "/llm/cli.shape.json": "apps/playground/app/llm/cli.shape.json/route.ts",
    "/llm/react.shape.json": "apps/playground/app/llm/react.shape.json/route.ts",
    "/llm/cloud.shape.json": "apps/playground/app/llm/cloud.shape.json/route.ts",
    "/llm/validation.shape.json": "apps/playground/app/llm/validation.shape.json/route.ts",
    "/llm/skill.shape.json": "apps/playground/app/llm/skill.shape.json/route.ts",
    "/llm/schema/wire-diagram.json": "apps/playground/app/llm/schema/wire-diagram.json/route.ts"
  };
  return routeMap[route];
}

function markdownFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.endsWith(".md")) files.push(path);
  }
  return files;
}

function declarationFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...declarationFiles(path));
    else if (entry.endsWith(".d.ts")) files.push(path);
  }
  return files;
}

function run(bin, args, options = {}) {
  const output = execFileSync(bin, args, {
    cwd: options.cwd ?? rootDir,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit"
  });
  return output ?? "";
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(rootDir, path), "utf8"));
}

function rootPackage() {
  return readJson("package.json");
}

function wireReactPackage() {
  return readJson("packages/wire-react/package.json");
}

async function wireCoreApi() {
  return import("../packages/wire-core/dist/index.js");
}

function relative(path) {
  return path.replace(`${rootDir}/`, "");
}
