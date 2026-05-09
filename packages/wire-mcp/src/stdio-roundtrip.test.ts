import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Real stdio MCP roundtrip — spawns the built server.js binary the same
 * way Claude Desktop and other stdio MCP clients do, then walks initialize →
 * tools/list → tools/call → resources/read.
 *
 * If this passes, an `externalMcp:` stdio entry pointed at
 * dist/server.js will work without further changes.
 */

const SERVER = resolve(__dirname, "../dist/server.js");

let tmp = "";
let client: Client;
let transport: StdioClientTransport;

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), "wire-stdio-test-"));
  transport = new StdioClientTransport({
    command: "node",
    args: [SERVER],
    env: {
      ...process.env,
      WIRE_STORAGE_DIR: tmp,
      WIRE_AGENT_ID: "stdio-smoke-test"
    }
  });
  client = new Client({ name: "wire-stdio-smoke", version: "0" }, { capabilities: {} });
  await client.connect(transport);
});

afterAll(async () => {
  await client?.close();
  await transport?.close();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe("stdio MCP roundtrip", () => {
  it("lists the required tool surface", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const required of [
      "create_diagram", "load_diagram", "save_diagram", "patch_diagram", "list_diagrams",
      "add_node", "update_node", "remove_node", "move_node", "resize_node",
      "connect", "disconnect", "update_edge", "remove_edge", "add_note", "set_layout",
      "add_group", "ungroup", "patch_metadata",
      "validate", "render_svg", "render_png", "render_preview",
      "summarize_diagram", "get_diagram_json", "export_mermaid",
      "apply_actions", "v1_get_agent_guide"
    ]) {
      expect(names).toContain(required);
    }
  });

  it("returns the agent guide for host prompt injection", async () => {
    const guide = await client.callTool({
      name: "v1_get_agent_guide",
      arguments: {}
    });
    const text = (guide.content as Array<{ text: string }>)[0]!.text;
    expect(text).toContain("Wire MCP Agent Guide");
    expect(text).toContain("wire__create_diagram");
    expect(text).toContain("apply_actions");
  });

  it("lists the required prompt surface", async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name);
    for (const required of [
      "diagram_from_codebase",
      "diagram_from_logs",
      "diagram_from_workflow_description",
      "review_diagram_for_clarity",
      "simplify_diagram"
    ]) {
      expect(names).toContain(required);
    }
  });

  it("create + add_node + validate + render_svg roundtrip", async () => {
    const created = await client.callTool({
      name: "create_diagram",
      arguments: { id: "smoke", title: "Smoke", layout: "LR" }
    });
    expect((created.content as Array<{ text: string }>)[0]?.text).toContain('"smoke"');

    await client.callTool({
      name: "add_node",
      arguments: { diagramId: "smoke", kind: "trigger", title: "Webhook fires", id: "webhook" }
    });
    await client.callTool({
      name: "add_node",
      arguments: { diagramId: "smoke", kind: "ai", title: "Plan", id: "plan", from: "webhook", model: "gpt-4.1" }
    });

    const validated = await client.callTool({
      name: "validate",
      arguments: { diagramId: "smoke" }
    });
    const validateText = (validated.content as Array<{ text: string }>)[0]!.text;
    expect(validateText).toContain('"valid": true');

    const svg = await client.callTool({
      name: "render_svg",
      arguments: { diagramId: "smoke" }
    });
    const svgText = (svg.content as Array<{ text: string }>)[0]!.text;
    expect(svgText).toMatch(/^<svg /);
    expect(svgText).toContain("Webhook fires");
    expect(svgText).toContain("Plan");
  });

  it("apply_actions performs a coherent multi-step edit", async () => {
    await client.callTool({
      name: "create_diagram",
      arguments: { id: "batch", title: "Batch", layout: "LR" }
    });

    const result = await client.callTool({
      name: "apply_actions",
      arguments: {
        diagramId: "batch",
        actions: [
          { type: "node.add", node: { kind: "trigger", title: "Start", id: "start" } },
          { type: "node.add", node: { kind: "action", title: "Approve", id: "approve" } },
          {
            type: "edge.connect",
            edge: {
              id: "approval",
              from: "start",
              to: "approve",
              label: "approved",
              routing: "smoothstep",
              style: { markerEnd: "arrow" }
            }
          }
        ]
      }
    });

    const text = (result.content as Array<{ text: string }>)[0]!.text;
    expect(text).toContain('"changedNodeIds"');
    expect(text).toContain('"changedEdgeIds"');
    expect(text).toContain('"approval"');

    const diagram = await client.callTool({
      name: "get_diagram_json",
      arguments: { diagramId: "batch" }
    });
    const json = JSON.parse((diagram.content as Array<{ text: string }>)[0]!.text);
    expect(json.edges[0]).toMatchObject({
      id: "approval",
      from: "start",
      to: "approve",
      label: "approved",
      routing: "smoothstep",
      style: { markerEnd: "arrow" }
    });
  });

  it("direct action tools cover move, resize, edge handles, metadata, and grouping", async () => {
    await client.callTool({
      name: "create_diagram",
      arguments: { id: "direct-actions", title: "Direct actions", layout: "LR" }
    });

    await client.callTool({
      name: "add_node",
      arguments: { diagramId: "direct-actions", kind: "trigger", title: "Start", id: "start" }
    });
    await client.callTool({
      name: "add_node",
      arguments: { diagramId: "direct-actions", kind: "action", title: "Notify", id: "notify" }
    });
    await client.callTool({
      name: "connect",
      arguments: {
        diagramId: "direct-actions",
        id: "start-notify",
        from: "start",
        to: "notify",
        label: "ok",
        fromHandle: "right",
        toHandle: "left",
        routing: "smoothstep",
        style: { markerEnd: "arrow", strokeWidth: 2 }
      }
    });
    await client.callTool({
      name: "update_edge",
      arguments: {
        diagramId: "direct-actions",
        id: "start-notify",
        patch: {
          label: "updated",
          fromHandle: "right",
          toHandle: "left",
          labelStyle: { background: "#ffffff", fontSize: 12 }
        }
      }
    });
    await client.callTool({
      name: "move_node",
      arguments: { diagramId: "direct-actions", id: "notify", position: { x: 300, y: 80 } }
    });
    await client.callTool({
      name: "resize_node",
      arguments: { diagramId: "direct-actions", id: "notify", size: { width: 240, height: 96 } }
    });
    await client.callTool({
      name: "patch_metadata",
      arguments: { diagramId: "direct-actions", patch: { owner: "wire" } }
    });
    await client.callTool({
      name: "add_group",
      arguments: { diagramId: "direct-actions", id: "ops", title: "Ops", children: ["notify"] }
    });
    await client.callTool({
      name: "ungroup",
      arguments: { diagramId: "direct-actions", id: "ops" }
    });

    const diagram = await client.callTool({
      name: "get_diagram_json",
      arguments: { diagramId: "direct-actions" }
    });
    const json = JSON.parse((diagram.content as Array<{ text: string }>)[0]!.text);
    expect(json.metadata).toEqual({ owner: "wire" });
    expect(json.nodes.find((node: { id: string }) => node.id === "notify")).toMatchObject({
      position: { x: 300, y: 80 },
      size: { width: 240, height: 96 }
    });
    expect(json.edges[0]).toMatchObject({
      id: "start-notify",
      label: "updated",
      fromHandle: "right",
      toHandle: "left",
      routing: "smoothstep",
      labelStyle: { background: "#ffffff", fontSize: 12 }
    });

    await client.callTool({
      name: "remove_edge",
      arguments: { diagramId: "direct-actions", id: "start-notify" }
    });
    const afterRemove = await client.callTool({
      name: "get_diagram_json",
      arguments: { diagramId: "direct-actions" }
    });
    const afterJson = JSON.parse((afterRemove.content as Array<{ text: string }>)[0]!.text);
    expect(afterJson.edges).toEqual([]);
  });

  it("resources: list templates + read schema + read diagram", async () => {
    const templates = await client.listResourceTemplates();
    const uris = templates.resourceTemplates.map((t) => t.uriTemplate);
    expect(uris).toContain("wire://diagrams/{id}.json");
    expect(uris).toContain("wire://diagrams/{id}.svg");
    expect(uris).toContain("wire://diagrams/{id}/preview");
    expect(uris).toContain("wire://templates/{name}");

    const schema = await client.readResource({ uri: "wire://schemas/wire-diagram" });
    expect(schema.contents[0]?.mimeType).toBe("application/schema+json");
    const text = schema.contents[0]?.text as string;
    expect(text.length).toBeGreaterThan(1000);
    expect(text).toContain("WireDiagram");

    const diagram = await client.readResource({ uri: "wire://diagrams/smoke.json" });
    expect(diagram.contents[0]?.mimeType).toBe("application/json");
    expect(diagram.contents[0]?.text as string).toContain('"webhook"');

    const preview = await client.readResource({ uri: "wire://diagrams/smoke/preview" });
    expect(preview.contents[0]?.text as string).toMatch(/^https?:\/\/.+\/preview\/inline\?d=/);
  });

  it("warns on connectsTo at save time (canonical JSON uses from; field is dropped on disk)", async () => {
    const saved = await client.callTool({
      name: "save_diagram",
      arguments: {
        diagramId: "bad",
        diagram: {
          version: 1,
          layout: "LR",
          nodes: [
            { id: "a", kind: "trigger", title: "A" },
            { id: "b", kind: "action", title: "B", connectsTo: "a" }
          ]
        }
      }
    });
    const text = (saved.content as Array<{ text: string }>)[0]!.text;
    expect(text).toContain("node.forbidden-field");
    // After save, the persisted file has connectsTo stripped — re-validate is clean.
    const reLoaded = await client.callTool({
      name: "get_diagram_json",
      arguments: { diagramId: "bad" }
    });
    expect((reLoaded.content as Array<{ text: string }>)[0]!.text).not.toContain("connectsTo");
  });
});
