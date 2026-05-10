import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * End-to-end smoke for the wire CLI. Spawns the built binary and walks
 * init → add → validate → export against an isolated temp dir.
 */
const CLI = resolve(__dirname, "../dist/cli.js");

let tmp = "";

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wire-cli-test-"));
});

afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

function wire(...args: string[]): string {
  return execFileSync("node", [CLI, ...args, `--dir=${tmp}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

describe("wire CLI", () => {
  it("prints help with no command", () => {
    const out = execFileSync("node", [CLI], { encoding: "utf8" });
    expect(out).toMatch(/wire init/);
    expect(out).toMatch(/wire export/);
    expect(out).toContain("--description=");
    expect(out).toContain("--ref=");
    expect(out).toContain("--tools=");
  });

  it("init → add → validate → export round-trip", () => {
    expect(existsSync(CLI)).toBe(true);

    const initOut = wire("init", "demo", "--title=Demo", "--layout=LR");
    expect(initOut).toMatch(/Created/);

    const addOut = wire(
      "add", "trigger",
      "--diagram=demo",
      "--title=Tick",
      "--id=tick"
    );
    expect(addOut).toMatch(/Added trigger/);

    const addAi = wire(
      "add", "ai",
      "--diagram=demo",
      "--title=Plan",
      "--id=plan",
      "--description=Choose next action",
      "--from=tick",
      "--model=gpt-4.1",
      "--tools=crm_search,notify"
    );
    expect(addAi).toMatch(/Added ai/);

    const addTool = wire(
      "add", "tool",
      "--diagram=demo",
      "--title=Search CRM",
      "--id=search-crm",
      "--from=plan",
      "--ref=crm.search"
    );
    expect(addTool).toMatch(/Added tool/);

    const validate = wire("validate", "demo");
    expect(validate).toMatch(/valid/);

    // export json
    const json = wire("export", "demo", "--format=json");
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe("demo");
    expect(parsed.nodes).toHaveLength(3);
    expect(parsed.nodes.find((node: { id: string }) => node.id === "plan")).toMatchObject({
      description: "Choose next action",
      tools: ["crm_search", "notify"]
    });
    expect(parsed.nodes.find((node: { id: string }) => node.id === "search-crm")).toMatchObject({
      ref: "crm.search"
    });

    // export svg to file
    const svgPath = join(tmp, "out.svg");
    wire("export", "demo", "--format=svg", `--out=${svgPath}`);
    const svg = readFileSync(svgPath, "utf8");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("Tick");
    expect(svg).toContain("Plan");
  });

  it("init with template", () => {
    const out = wire("init", "approval", "--template=approval-flow");
    expect(out).toMatch(/Created/);
    const v = wire("validate", "approval");
    expect(v).toMatch(/valid/);
  });

  it("validate fails (exit 1) on broken graph", () => {
    wire("init", "broken");
    // Manually corrupt the diagram with a missing-source ref.
    const path = join(tmp, "broken.json");
    const raw = JSON.parse(readFileSync(path, "utf8"));
    raw.nodes.push({ id: "x", kind: "action", title: "X", from: "ghost" });
    require("node:fs").writeFileSync(path, JSON.stringify(raw, null, 2));
    expect(() => wire("validate", "broken")).toThrow();
  });
});
