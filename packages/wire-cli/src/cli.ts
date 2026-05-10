#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import {
  parseWireDiagram,
  emptyDiagram,
  validate,
  toMermaid,
  addNode,
  type WireDiagram
} from "@aigentive/wire-core";
import { renderToSvg } from "@aigentive/wire-renderers";

const HELP = `wire — author Wire diagrams from the command line.

Usage:
  wire init <id> [--title="…"] [--layout=LR|TB|RL|BT] [--template=agent-workflow|approval-flow|rag-pipeline]
  wire add <kind> --diagram=<id> --title="…" [--id=…] [--description=…] [--from=…] [--branch=…] [--branches=a,b] [--model=…] [--tools=a,b] [--ref=…] [--body=…] [--tone=success|warning|error|info|ai]
  wire validate <id>
  wire export <id> --format=svg|json|mermaid [--out=…]
  wire ls
  wire help

Storage:
  --dir=<path>    Override storage dir (default ./diagrams or $WIRE_DIR)
`;

const DEFAULT_DIR = process.env.WIRE_DIR ?? "./diagrams";

interface Flags {
  dir: string;
  pos: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Flags {
  const pos: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq === -1) {
        flags[a.slice(2)] = true;
      } else {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      }
    } else {
      pos.push(a);
    }
  }
  const dir = (typeof flags.dir === "string" ? flags.dir : undefined) ?? DEFAULT_DIR;
  return { dir, pos, flags };
}

function pathFor(dir: string, id: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Diagram id "${id}" must match /^[A-Za-z0-9_-]+$/.`);
  }
  return join(dir, `${id}.json`);
}

async function load(dir: string, id: string): Promise<WireDiagram> {
  const path = pathFor(dir, id);
  if (!existsSync(path)) throw new Error(`Diagram "${id}" not found at ${path}`);
  const raw = await readFile(path, "utf8");
  return parseWireDiagram(JSON.parse(raw));
}

async function save(dir: string, id: string, diagram: WireDiagram): Promise<void> {
  const path = pathFor(dir, id);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ ...diagram, id }, null, 2)}\n`, "utf8");
}

async function cmdInit(args: Flags): Promise<void> {
  const id = args.pos[1];
  if (!id) throw new Error("init requires <id>: wire init my-flow");
  const path = pathFor(args.dir, id);
  if (existsSync(path)) throw new Error(`Diagram already exists at ${path}`);

  const title = strFlag(args, "title");
  const layout = (strFlag(args, "layout") as WireDiagram["layout"] | undefined) ?? "LR";
  const template = strFlag(args, "template");

  let diagram: WireDiagram;
  if (template) {
    const { TEMPLATES } = await loadTemplates();
    const tpl = TEMPLATES[template];
    if (!tpl) {
      throw new Error(`Unknown template "${template}". Known: ${Object.keys(TEMPLATES).join(", ")}.`);
    }
    diagram = { ...tpl, id, layout };
    if (title !== undefined) diagram.title = title;
  } else {
    const init: { id: string; title?: string; layout: WireDiagram["layout"] } = { id, layout };
    if (title !== undefined) init.title = title;
    diagram = emptyDiagram(init);
  }
  await save(args.dir, id, diagram);
  console.log(`Created ${path}`);
}

async function cmdAdd(args: Flags): Promise<void> {
  const kind = args.pos[1];
  if (!kind) throw new Error("add requires <kind>: wire add ai --diagram=my-flow --title='Plan'");
  const diagramId = strFlag(args, "diagram");
  if (!diagramId) throw new Error("add requires --diagram=<id>");
  const title = strFlag(args, "title");
  if (!title) throw new Error("add requires --title");
  const diagram = await load(args.dir, diagramId);
  const branches = strFlag(args, "branches")?.split(",").map((s) => s.trim()).filter(Boolean);
  const tools = strFlag(args, "tools")?.split(",").map((s) => s.trim()).filter(Boolean);
  const opts: Parameters<typeof addNode>[1] = {
    kind: kind as Parameters<typeof addNode>[1]["kind"],
    title
  };
  const id = strFlag(args, "id");
  if (id !== undefined) opts.id = id;
  const description = strFlag(args, "description");
  if (description !== undefined) opts.description = description;
  const from = strFlag(args, "from");
  if (from !== undefined) opts.from = from;
  const branch = strFlag(args, "branch");
  if (branch !== undefined) opts.branch = branch;
  const tone = strFlag(args, "tone") as Parameters<typeof addNode>[1]["tone"];
  if (tone !== undefined) opts.tone = tone;
  const model = strFlag(args, "model");
  if (model !== undefined) opts.model = model;
  const ref = strFlag(args, "ref");
  if (ref !== undefined) opts.ref = ref;
  const body = strFlag(args, "body");
  if (body !== undefined) opts.body = body;
  if (branches !== undefined) opts.branches = branches;
  if (tools !== undefined) opts.tools = tools;
  const result = addNode(diagram, opts);
  await save(args.dir, diagramId, result.diagram);
  console.log(`Added ${result.node.kind} "${result.node.id}" to ${diagramId}`);
}

async function cmdValidate(args: Flags): Promise<void> {
  const id = args.pos[1];
  if (!id) throw new Error("validate requires <id>");
  const diagram = await load(args.dir, id);
  const result = validate(diagram);
  if (result.valid) {
    console.log(`✓ ${id} valid (${result.issues.length} warning${result.issues.length === 1 ? "" : "s"})`);
  } else {
    console.log(`✗ ${id} invalid:`);
  }
  for (const issue of result.issues) {
    const prefix = issue.severity === "error" ? "  ERROR" : "  warn";
    console.log(`${prefix} [${issue.code}] ${issue.message}`);
    if (issue.hint) console.log(`         hint: ${issue.hint}`);
  }
  if (!result.valid) process.exit(1);
}

async function cmdExport(args: Flags): Promise<void> {
  const id = args.pos[1];
  if (!id) throw new Error("export requires <id>");
  const fmt = strFlag(args, "format") ?? "svg";
  const diagram = await load(args.dir, id);
  let body = "";
  let defaultExt = "txt";
  if (fmt === "svg") {
    body = renderToSvg(diagram);
    defaultExt = "svg";
  } else if (fmt === "json") {
    body = JSON.stringify(diagram, null, 2);
    defaultExt = "json";
  } else if (fmt === "mermaid") {
    body = toMermaid(diagram);
    defaultExt = "mmd";
  } else {
    throw new Error(`Unknown format "${fmt}". Try svg | json | mermaid.`);
  }
  const out = strFlag(args, "out");
  if (!out) {
    process.stdout.write(body);
    if (!body.endsWith("\n")) process.stdout.write("\n");
    return;
  }
  const finalOut = out.includes(".") ? out : `${out}.${defaultExt}`;
  await mkdir(dirname(resolve(finalOut)), { recursive: true });
  await writeFile(finalOut, body, "utf8");
  console.log(`Wrote ${finalOut}`);
}

async function cmdLs(args: Flags): Promise<void> {
  if (!existsSync(args.dir)) {
    console.log(`(empty — no diagrams in ${args.dir})`);
    return;
  }
  const files = (await readdir(args.dir)).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log(`(no diagrams in ${args.dir})`);
    return;
  }
  const entries = await Promise.all(
    files.map(async (file) => {
      const path = join(args.dir, file);
      return { file, path, stats: await stat(path) };
    })
  );
  entries.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs || a.file.localeCompare(b.file));
  for (const entry of entries) {
    const f = entry.file;
    const id = f.replace(/\.json$/, "");
    try {
      const raw = await readFile(entry.path, "utf8");
      const d = parseWireDiagram(JSON.parse(raw));
      console.log(
        `${id.padEnd(30)}  ${String(d.nodes.length).padStart(3)} nodes  ${d.layout}  ${entry.stats.mtime.toISOString()}`
      );
    } catch {
      console.log(`${id.padEnd(30)}  (unreadable)`);
    }
  }
}

function strFlag(args: Flags, key: string): string | undefined {
  const v = args.flags[key];
  return typeof v === "string" ? v : undefined;
}

async function loadTemplates(): Promise<{ TEMPLATES: Record<string, WireDiagram> }> {
  // Inline templates (mirrors wire-mcp/src/templates.ts so wire-cli has no
  // hidden dependency on wire-mcp internals).
  const TEMPLATES: Record<string, WireDiagram> = {
    "agent-workflow": {
      version: 1, layout: "LR", title: "Agent workflow",
      nodes: [
        { id: "trigger", kind: "trigger", title: "Trigger" },
        { id: "plan", kind: "ai", title: "Plan", from: "trigger", model: "gpt-4.1" },
        { id: "tools", kind: "tool", title: "Tools", from: "plan" },
        { id: "respond", kind: "action", title: "Respond", from: "tools", tone: "success" }
      ],
      edges: []
    },
    "approval-flow": {
      version: 1, layout: "LR", title: "Approval flow",
      nodes: [
        { id: "incoming", kind: "trigger", title: "Incoming request" },
        { id: "classify", kind: "ai", title: "Classify", from: "incoming", model: "gpt-4.1" },
        { id: "needs-approval", kind: "condition", title: "Needs approval?", from: "classify", branches: ["yes", "no"] },
        { id: "approve", kind: "human", title: "Approve", from: "needs-approval.yes" },
        { id: "auto-respond", kind: "action", title: "Auto respond", from: "needs-approval.no", tone: "success" },
        { id: "send", kind: "action", title: "Send", from: ["approve", "auto-respond"] }
      ],
      edges: []
    },
    "rag-pipeline": {
      version: 1, layout: "LR", title: "RAG pipeline",
      nodes: [
        { id: "user-query", kind: "trigger", title: "User query" },
        { id: "retrieve", kind: "retrieval", title: "Retrieve docs", from: "user-query" },
        { id: "guardrail", kind: "guardrail", title: "Safety check", from: "retrieve" },
        { id: "generate", kind: "ai", title: "Generate", from: "guardrail", model: "gpt-4.1" },
        { id: "respond", kind: "action", title: "Respond", from: "generate", tone: "success" }
      ],
      edges: []
    }
  };
  return { TEMPLATES };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args.pos[0];
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    process.stdout.write(HELP);
    return;
  }
  switch (cmd) {
    case "init": return cmdInit(args);
    case "add": return cmdAdd(args);
    case "validate": return cmdValidate(args);
    case "export": return cmdExport(args);
    case "ls": return cmdLs(args);
    default:
      process.stderr.write(`Unknown command: ${cmd}\n${HELP}`);
      process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
