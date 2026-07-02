import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { AuditLogger, sanitizeAuditValue, summariseParams } from "./audit";

const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

afterEach(() => {
  stderrSpy.mockClear();
});

afterAll(() => {
  stderrSpy.mockRestore();
});

describe("audit sanitizer", () => {
  it("redacts nested sensitive keys", () => {
    expect(sanitizeAuditValue({
      diagramId: "safe-id",
      data: { apiKey: "secret", nested: { prompt: "hidden" } },
      metadata: { ownerKey: "owner" }
    })).toEqual({
      diagramId: "safe-id",
      data: "<redacted>",
      metadata: "<redacted>"
    });
  });

  it("summarizes action arrays without raw payloads", () => {
    const summary = summariseParams({
      diagramId: "demo",
      actions: [
        { type: "node.add", node: { id: "a", prompt: "hidden" } },
        { type: "node.patch", patch: { data: { token: "hidden" } } }
      ]
    });

    expect(summary).toContain("diagramId=demo");
    expect(summary).toContain("actions=<redacted count=2 types=node.add,node.patch>");
    expect(summary).not.toContain("hidden");
    expect(summary).not.toContain("node={");
  });

  it("uses the same sanitized summary for stderr and JSONL", async () => {
    const dir = mkdtempSync(join(tmpdir(), "wire-audit-test-"));
    const logPath = join(dir, "audit.jsonl");
    try {
      const logger = new AuditLogger({ filePath: logPath });
      await logger.log({
        tool: "save_diagram",
        actor: "test",
        status: "error",
        durationMs: 1,
        diagramId: "demo",
        errorType: "ZodError",
        params: {
          diagramId: "demo",
          diagram: { nodes: [{ id: "a", data: { apiKey: "secret" } }] }
        }
      });

      const line = readFileSync(logPath, "utf8").trim();
      const record = JSON.parse(line) as { paramsSummary: string };
      const stderrLine = String(stderrSpy.mock.calls.at(-1)?.[0] ?? "");
      expect(record.paramsSummary).toContain("diagram=<redacted>");
      expect(record.paramsSummary).not.toContain("secret");
      expect(stderrLine).toContain(record.paramsSummary);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
