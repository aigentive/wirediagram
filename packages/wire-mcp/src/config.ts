import { z } from "zod";
import { homedir } from "node:os";
import { join } from "node:path";

const ConfigSchema = z.object({
  WIRE_STORAGE_DIR: z.string().optional(),
  WIRE_HTTP_PORT: z.coerce.number().int().positive().optional(),
  WIRE_HTTP_HOST: z.string().optional(),
  WIRE_AUDIT_LOG: z.string().optional(),
  WIRE_DEFAULT_LAYOUT: z.enum(["LR", "TB", "RL", "BT"]).optional(),
  WIRE_PNG_ENABLED: z.coerce.boolean().optional(),
  WIRE_AGENT_ID: z.string().optional()
});

export interface WireMcpConfig {
  storageDir: string;
  httpPort: number;
  httpHost: string;
  httpEnabled: boolean;
  auditLog?: string;
  defaultLayout: "LR" | "TB" | "RL" | "BT";
  pngEnabled: boolean;
  agentId: string;
}

export function loadConfig(argv: string[] = process.argv): WireMcpConfig {
  const raw = ConfigSchema.parse({
    WIRE_STORAGE_DIR: process.env.WIRE_STORAGE_DIR,
    WIRE_HTTP_PORT: process.env.WIRE_HTTP_PORT,
    WIRE_HTTP_HOST: process.env.WIRE_HTTP_HOST,
    WIRE_AUDIT_LOG: process.env.WIRE_AUDIT_LOG,
    WIRE_DEFAULT_LAYOUT: process.env.WIRE_DEFAULT_LAYOUT,
    WIRE_PNG_ENABLED: process.env.WIRE_PNG_ENABLED,
    WIRE_AGENT_ID: process.env.WIRE_AGENT_ID
  });

  const storageDir = raw.WIRE_STORAGE_DIR ?? join(homedir(), ".wire", "diagrams");
  const config: WireMcpConfig = {
    storageDir,
    httpPort: raw.WIRE_HTTP_PORT ?? 3860,
    httpHost: raw.WIRE_HTTP_HOST ?? "127.0.0.1",
    httpEnabled: argv.includes("--http"),
    defaultLayout: raw.WIRE_DEFAULT_LAYOUT ?? "LR",
    pngEnabled: raw.WIRE_PNG_ENABLED ?? false,
    agentId: raw.WIRE_AGENT_ID ?? "wire-mcp"
  };
  if (raw.WIRE_AUDIT_LOG !== undefined) config.auditLog = raw.WIRE_AUDIT_LOG;
  return config;
}
