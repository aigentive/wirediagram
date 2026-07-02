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

const REDACTED_KEY_PATTERNS = [
  "key",
  "token",
  "secret",
  "authorization",
  "apikey",
  "password",
  "prompt",
  "diagram_json",
  "data",
  "metadata",
  "schema",
  "body"
];

export function summariseParams(params: unknown): string {
  if (!params || typeof params !== "object") return String(params ?? "");
  return Object.entries(params as Record<string, unknown>)
    .map(([k, v]) => {
      const summary = redactedSummary(k, v);
      if (summary) return `${k}=${summary}`;
      const safeValue = sanitizeAuditValue(v);
      const str = typeof safeValue === "object" ? JSON.stringify(safeValue) : String(safeValue);
      return `${k}=${str.length > 80 ? `${str.slice(0, 80)}…` : str}`;
    })
    .join(" ");
}

export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeAuditValue(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const summary = redactedSummary(key, nested);
    out[key] = summary ?? sanitizeAuditValue(nested);
  }
  return out;
}

function redactedSummary(key: string, value: unknown): string | null {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();
  if (normalized === "diagramid") return null;
  if (normalized === "wireid") return null;
  if (normalized === "actions" && Array.isArray(value)) {
    const types = value
      .map((action) => action && typeof action === "object" ? (action as { type?: unknown }).type : null)
      .filter((type): type is string => typeof type === "string");
    const uniqueTypes = Array.from(new Set(types));
    return `<redacted count=${value.length}${uniqueTypes.length ? ` types=${uniqueTypes.join(",")}` : ""}>`;
  }
  if (normalized === "diagram" || normalized === "diagramjson") return "<redacted>";
  if (REDACTED_KEY_PATTERNS.some((pattern) => normalized.includes(pattern))) return "<redacted>";
  return null;
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
