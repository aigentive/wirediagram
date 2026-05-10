import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient, type Client } from "@libsql/client";

export type DbClient = Client;

let client: Client | null = null;
let migrations: Promise<void> | null = null;

export function shouldUseDatabaseStore(): boolean {
  const backend = process.env.WIRE_CLOUD_BACKEND;
  if (backend === "blob" || backend === "filesystem" || backend === "fs") return false;
  if (backend === "sqlite" || backend === "turso" || backend === "database" || backend === "local") return true;
  if (process.env.TURSO_DATABASE_URL) return true;
  return !process.env.VERCEL && process.env.NODE_ENV !== "production";
}

export async function getDbClient(): Promise<Client> {
  const db = getRawDbClient();
  if (!migrations) migrations = runMigrations(db);
  await migrations;
  return db;
}

export function getRawDbClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url && url !== "file:local") {
    client = createClient({ url, authToken });
    return client;
  }

  const localUrl = process.env.LOCAL_DB_PATH ?? "file:./storage/wire.db";
  ensureLocalDbDirectory(localUrl);
  client = createClient({ url: localUrl });
  return client;
}

export function createTestClient(): Client {
  return createClient({ url: "file::memory:" });
}

export function resetDbClient(): void {
  client = null;
  migrations = null;
}

function ensureLocalDbDirectory(url: string): void {
  if (!url.startsWith("file:") || url === "file::memory:") return;
  const pathname = url.slice("file:".length);
  if (!pathname || pathname === "local" || pathname === ":memory:") return;
  mkdirSync(dirname(pathname), { recursive: true });
}

async function runMigrations(db: Client): Promise<void> {
  await db.executeMultiple(`
CREATE TABLE IF NOT EXISTS wire_kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/json',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS wire_kv_updated_desc
  ON wire_kv (updated_at DESC);
`);
}
