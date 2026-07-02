import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createServer, WIRE_MCP_SERVER_VERSION } from "./server.js";
import { MemoryStorage } from "./storage.js";
import { addNode } from "@aigentive/wire-core";

/**
 * Smoke tests for the MCP server. We don't spin up the actual transport;
 * we exercise the storage backend + tool implementations through the
 * underlying core modules we know are wired in.
 */
describe("wire-mcp server bootstrap", () => {
  it("advertises the package version", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version: string;
    };
    expect(WIRE_MCP_SERVER_VERSION).toBe(packageJson.version);
  });

  it("creates a server with in-memory storage", () => {
    const storage = new MemoryStorage();
    const handle = createServer({ storage });
    expect(handle.server).toBeTruthy();
    expect(handle.storage).toBe(storage);
  });

  it("storage round-trip via createServer", async () => {
    const storage = new MemoryStorage();
    createServer({ storage });
    await storage.save("demo", {
      version: 1,
      layout: "LR",
      nodes: [
        { id: "t", kind: "trigger", title: "Tick" },
        { id: "a", kind: "ai", title: "Plan", from: "t", model: "gpt-4.1" }
      ],
      edges: []
    });
    const loaded = await storage.load("demo");
    expect(loaded.nodes).toHaveLength(2);
  });
});

describe("storage", () => {
  it("rejects unsafe ids", async () => {
    const storage = new MemoryStorage();
    await expect(storage.load("../etc/passwd")).rejects.toThrow();
  });

  it("lists in recency order", async () => {
    const storage = new MemoryStorage();
    await storage.save("first", { version: 1, layout: "LR", nodes: [], edges: [] });
    await new Promise((r) => setTimeout(r, 5));
    await storage.save("second", { version: 1, layout: "LR", nodes: [], edges: [] });
    const list = await storage.list();
    expect(list[0]?.id).toBe("second");
  });

  it("serializes read-modify-write mutations per diagram", async () => {
    const storage = new MemoryStorage();
    await storage.save("race", { version: 1, layout: "LR", nodes: [], edges: [] });

    await Promise.all([
      storage.mutate("race", async (diagram) => {
        await new Promise((r) => setTimeout(r, 10));
        return addNode(diagram, { kind: "trigger", title: "A", id: "a" }).diagram;
      }),
      storage.mutate("race", async (diagram) => {
        return addNode(diagram, { kind: "trigger", title: "B", id: "b" }).diagram;
      })
    ]);

    const loaded = await storage.load("race");
    expect(loaded.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });
});
