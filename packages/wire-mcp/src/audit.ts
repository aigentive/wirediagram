import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export type AuditStatus = "ok" | "error" | "blocked";

export interface AuditEvent {
  timestamp: string;
  tool: string;
  actor: string;
  status: AuditStatus;
  durationMs: number;
  paramsSummary: string;
  errorType?: string;
  diagramId?: string;
}

const REDACTED_KEYS = new Set(["body", "data", "prompt", "schema"]);

function summariseParams(params: unknown): string {
  if (!params || typeof params !== "object") return String(params ?? "");
  return Object.entries(params as Record<string, unknown>)
    .map(([k, v]) => {
      if (REDACTED_KEYS.has(k)) return `${k}=<redacted>`;
      const str = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `${k}=${str.length > 80 ? `${str.slice(0, 80)}…` : str}`;
    })
    .join(" ");
}

export interface AuditLoggerOptions {
  /** File path to append events as JSONL. If omitted, audit goes to stderr only. */
  filePath?: string;
  /** Echo events to stderr regardless of filePath. Default true. */
  echoStderr?: boolean;
}

export class AuditLogger {
  private readonly filePath: string | undefined;
  private readonly echoStderr: boolean;

  constructor(opts: AuditLoggerOptions = {}) {
    this.filePath = opts.filePath; // undefined ok
    this.echoStderr = opts.echoStderr ?? true;
  }

  async log(event: Omit<AuditEvent, "timestamp" | "paramsSummary"> & { params: unknown }): Promise<void> {
    const { params, ...rest } = event;
    const record: AuditEvent = {
      timestamp: new Date().toISOString(),
      paramsSummary: summariseParams(params),
      ...rest
    };
    const line = `${JSON.stringify(record)}\n`;
    if (this.filePath) {
      try {
        await mkdir(dirname(this.filePath), { recursive: true });
        await appendFile(this.filePath, line, "utf8");
      } catch (err) {
        process.stderr.write(`[audit] write failed: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
    if (this.echoStderr) {
      process.stderr.write(`[wire-mcp] ${record.tool} ${record.status} ${record.durationMs}ms ${record.paramsSummary}\n`);
    }
  }
}
