import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";

const SERVER = resolve(__dirname, "../dist/server.js");

let tmp = "";
let port = 0;
let child: ChildProcessWithoutNullStreams | undefined;

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      server.close(() => resolvePort(address.port));
    });
  });
}

async function waitForHealth(url: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = `${res.status} ${await res.text()}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`HTTP server did not become healthy: ${lastError}`);
}

async function createClient(name: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));
  const client = new Client({ name, version: "0" }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), "wire-http-test-"));
  port = await freePort();
  child = spawn("node", [SERVER, "--http"], {
    env: {
      ...process.env,
      WIRE_STORAGE_DIR: tmp,
      WIRE_HTTP_HOST: "127.0.0.1",
      WIRE_HTTP_PORT: String(port),
      WIRE_PREVIEW_BASE: "http://localhost:3870",
      WIRE_AGENT_ID: "http-smoke-test"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForHealth(`http://127.0.0.1:${port}/health`);
});

afterAll(async () => {
  child?.kill();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe("streamable HTTP MCP roundtrip", () => {
  it("supports multiple client sessions against shared storage", async () => {
    const first = await createClient("wire-http-smoke-1");
    try {
      const { tools } = await first.listTools();
      expect(tools.map((tool) => tool.name)).toContain("update_edge");
      await first.callTool({
        name: "create_diagram",
        arguments: { id: "http-smoke", title: "HTTP Smoke", layout: "LR" }
      });
      await first.callTool({
        name: "add_node",
        arguments: { diagramId: "http-smoke", kind: "trigger", id: "start", title: "Webhook" }
      });
    } finally {
      await first.close();
    }

    const second = await createClient("wire-http-smoke-2");
    try {
      await second.callTool({
        name: "add_node",
        arguments: { diagramId: "http-smoke", kind: "action", id: "notify", title: "Notify", from: "start" }
      });
      const validated = await second.callTool({
        name: "validate",
        arguments: { diagramId: "http-smoke" }
      });
      expect((validated.content as Array<{ text: string }>)[0]!.text).toContain('"valid": true');

      const preview = await second.callTool({
        name: "render_preview",
        arguments: { diagramId: "http-smoke" }
      });
      const previewJson = JSON.parse((preview.content as Array<{ text: string }>)[0]!.text);
      expect(previewJson.previewUrl).toMatch(/^http:\/\/localhost:3870\/preview\/inline\?d=/);
    } finally {
      await second.close();
    }
  });
});
