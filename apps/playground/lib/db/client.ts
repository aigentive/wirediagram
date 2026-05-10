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

CREATE TABLE IF NOT EXISTS wire_users (
  user_key TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  image TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  seen_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS wire_users_last_seen_desc
  ON wire_users (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS wire_user_events (
  id TEXT PRIMARY KEY NOT NULL,
  user_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS wire_user_events_user_created_desc
  ON wire_user_events (user_key, created_at DESC);

CREATE TABLE IF NOT EXISTS wire_documents (
  user_key TEXT NOT NULL,
  wire_id TEXT NOT NULL,
  title TEXT NOT NULL,
  current_token TEXT NOT NULL,
  node_count INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  last_client_mutation_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_key, wire_id)
);

CREATE INDEX IF NOT EXISTS wire_documents_user_updated_desc
  ON wire_documents (user_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS wire_versions (
  id TEXT PRIMARY KEY NOT NULL,
  user_key TEXT NOT NULL,
  wire_id TEXT NOT NULL,
  token TEXT NOT NULL,
  source TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS wire_versions_wire_created_desc
  ON wire_versions (user_key, wire_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wire_chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  user_key TEXT,
  actor_key TEXT,
  wire_id TEXT,
  surface TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  cost_usd REAL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS wire_chat_messages_wire_created_asc
  ON wire_chat_messages (user_key, wire_id, created_at ASC);

CREATE INDEX IF NOT EXISTS wire_chat_messages_surface_created_desc
  ON wire_chat_messages (surface, created_at DESC);
`);
}
