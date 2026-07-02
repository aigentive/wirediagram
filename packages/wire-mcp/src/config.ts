import { z } from "zod";
import { homedir } from "node:os";
import { join } from "node:path";

const ConfigSchema = z.object({
  WIRE_STORAGE_DIR: z.string().optional(),
  WIRE_HTTP_PORT: z.coerce.number().int().positive().optional(),
  WIRE_HTTP_HOST: z.string().optional(),
  WIRE_HTTP_UNSAFE_ALLOW_REMOTE: z.string().optional(),
  WIRE_MCP_TOKEN: z.string().optional(),
  WIRE_MCP_ALLOWED_ORIGINS: z.string().optional(),
  WIRE_AUDIT_LOG: z.string().optional(),
  WIRE_DEFAULT_LAYOUT: z.enum(["LR", "TB", "RL", "BT"]).optional(),
  WIRE_PNG_ENABLED: z.coerce.boolean().optional(),
  WIRE_AGENT_ID: z.string().optional(),
  WIRE_PREVIEW_BASE: z.string().url().optional(),
  WIRE_CLOUD_URL: z.string().url().optional(),
  WIRE_CLOUD_API_KEY: z.string().optional()
});

export interface WireMcpConfig {
  storageDir: string;
  httpPort: number;
  httpHost: string;
  httpEnabled: boolean;
  httpUnsafeAllowRemote: boolean;
  mcpToken?: string;
  mcpAllowedOrigins: string[];
  auditLog?: string;
  defaultLayout: "LR" | "TB" | "RL" | "BT";
  pngEnabled: boolean;
  agentId: string;
  previewBase: string;
  cloudUrl?: string;
  cloudApiKey?: string;
}

export function loadConfig(argv: string[] = process.argv): WireMcpConfig {
  const raw = ConfigSchema.parse({
    WIRE_STORAGE_DIR: process.env.WIRE_STORAGE_DIR,
    WIRE_HTTP_PORT: process.env.WIRE_HTTP_PORT,
    WIRE_HTTP_HOST: process.env.WIRE_HTTP_HOST,
    WIRE_HTTP_UNSAFE_ALLOW_REMOTE: process.env.WIRE_HTTP_UNSAFE_ALLOW_REMOTE,
    WIRE_MCP_TOKEN: process.env.WIRE_MCP_TOKEN,
    WIRE_MCP_ALLOWED_ORIGINS: process.env.WIRE_MCP_ALLOWED_ORIGINS,
    WIRE_AUDIT_LOG: process.env.WIRE_AUDIT_LOG,
    WIRE_DEFAULT_LAYOUT: process.env.WIRE_DEFAULT_LAYOUT,
    WIRE_PNG_ENABLED: process.env.WIRE_PNG_ENABLED,
    WIRE_AGENT_ID: process.env.WIRE_AGENT_ID,
    WIRE_PREVIEW_BASE: process.env.WIRE_PREVIEW_BASE,
    WIRE_CLOUD_URL: process.env.WIRE_CLOUD_URL,
    WIRE_CLOUD_API_KEY: process.env.WIRE_CLOUD_API_KEY
  });

  const storageDir = raw.WIRE_STORAGE_DIR ?? join(homedir(), ".wire", "diagrams");
  const config: WireMcpConfig = {
    storageDir,
    httpPort: raw.WIRE_HTTP_PORT ?? 3860,
    httpHost: raw.WIRE_HTTP_HOST ?? "127.0.0.1",
    httpEnabled: argv.includes("--http"),
    httpUnsafeAllowRemote: parseBoolean(raw.WIRE_HTTP_UNSAFE_ALLOW_REMOTE),
    mcpAllowedOrigins: parseList(raw.WIRE_MCP_ALLOWED_ORIGINS),
    defaultLayout: raw.WIRE_DEFAULT_LAYOUT ?? "LR",
    pngEnabled: raw.WIRE_PNG_ENABLED ?? false,
    agentId: raw.WIRE_AGENT_ID ?? "wire-mcp",
    previewBase: raw.WIRE_PREVIEW_BASE ?? raw.WIRE_CLOUD_URL ?? "http://localhost:3870"
  };
  if (raw.WIRE_MCP_TOKEN !== undefined && raw.WIRE_MCP_TOKEN.trim()) {
    config.mcpToken = raw.WIRE_MCP_TOKEN.trim();
  }
  if (raw.WIRE_CLOUD_URL !== undefined) config.cloudUrl = raw.WIRE_CLOUD_URL;
  if (raw.WIRE_CLOUD_API_KEY !== undefined) config.cloudApiKey = raw.WIRE_CLOUD_API_KEY;
  if (raw.WIRE_AUDIT_LOG !== undefined) config.auditLog = raw.WIRE_AUDIT_LOG;
  return config;
}

export function assertHttpSecurityConfig(config: WireMcpConfig): void {
  if (!config.httpEnabled || isLoopbackHost(config.httpHost)) return;
  if (config.httpUnsafeAllowRemote || config.mcpToken) return;
  throw new Error(
    "WIRE_HTTP_HOST binds a non-loopback interface. Set WIRE_MCP_TOKEN for authenticated HTTP, or set WIRE_HTTP_UNSAFE_ALLOW_REMOTE=true to opt in explicitly."
  );
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}
