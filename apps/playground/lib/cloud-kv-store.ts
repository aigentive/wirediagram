import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { del, list, put } from "@vercel/blob";
import { readBlobJson } from "@/lib/blob-json";
import { getDbClient, shouldUseDatabaseStore } from "@/lib/db/client";

export type CloudStoreBackend = "database" | "blob" | "filesystem";

export function cloudStoreBackend(): CloudStoreBackend {
  if (shouldUseDatabaseStore()) return "database";
  if (process.env.WIRE_CLOUD_BACKEND !== "local" && Boolean(process.env.BLOB_READ_WRITE_TOKEN)) return "blob";
  return "filesystem";
}

export async function readCloudJson<T>(
  pathname: string,
  options: { useCache?: boolean; bustCache?: boolean } = {}
): Promise<T | null> {
  const backend = cloudStoreBackend();
  if (backend === "database") {
    const stored = await readDatabaseText(pathname);
    return stored !== null ? JSON.parse(stored) as T : null;
  }

  if (backend === "blob") {
    return readBlobJson<T>(pathname, options);
  }

  return readFilesystemJson<T>(pathname);
}

export async function writeCloudText(pathname: string, body: string): Promise<void> {
  if (cloudStoreBackend() === "database") {
    await writeDatabaseText(pathname, body);
    return;
  }

  if (cloudStoreBackend() === "blob") {
    await put(pathname, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json"
    });
    return;
  }

  await writeFilesystemText(pathname, body);
}

export async function writeCloudJson(pathname: string, value: unknown): Promise<void> {
  await writeCloudText(pathname, JSON.stringify(value));
}

export async function deleteCloudValue(pathname: string): Promise<void> {
  const backend = cloudStoreBackend();
  if (backend === "database") {
    await deleteDatabaseValue(pathname);
    return;
  }

  if (backend === "blob") {
    try {
      await del(pathname);
    } catch {
      // Already gone is fine.
    }
    return;
  }

  try {
    await unlink(filesystemPath(pathname));
  } catch {
    // Already gone is fine.
  }
}

export async function listCloudPaths(prefix: string): Promise<string[]> {
  const backend = cloudStoreBackend();
  if (backend === "database") {
    return listDatabasePaths(prefix);
  }

  if (backend === "blob") {
    return listBlobPaths(prefix);
  }

  return listFilesystemPaths(prefix);
}

async function readDatabaseText(pathname: string): Promise<string | null> {
  const db = await getDbClient();
  const result = await db.execute({
    sql: "SELECT value FROM wire_kv WHERE key = ?",
    args: [pathname]
  });
  const row = result.rows[0] as { value?: unknown } | undefined;
  return typeof row?.value === "string" ? row.value : null;
}

async function writeDatabaseText(pathname: string, body: string): Promise<void> {
  const db = await getDbClient();
  await db.execute({
    sql: `
INSERT INTO wire_kv (key, value, content_type, created_at, updated_at)
VALUES (?, ?, 'application/json', datetime('now'), datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  content_type = excluded.content_type,
  updated_at = excluded.updated_at
`,
    args: [pathname, body]
  });
}

async function deleteDatabaseValue(pathname: string): Promise<void> {
  const db = await getDbClient();
  await db.execute({
    sql: "DELETE FROM wire_kv WHERE key = ?",
    args: [pathname]
  });
}

async function listDatabasePaths(prefix: string): Promise<string[]> {
  const db = await getDbClient();
  const result = await db.execute({
    sql: "SELECT key FROM wire_kv WHERE key >= ? AND key < ? ORDER BY key ASC",
    args: [prefix, `${prefix}\uffff`]
  });
  return result.rows
    .map((row) => (row as { key?: unknown }).key)
    .filter((key): key is string => typeof key === "string");
}

async function listBlobPaths(prefix: string): Promise<string[]> {
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix, cursor, limit: 1000 });
    paths.push(...result.blobs.map((blob) => blob.pathname));
    cursor = result.cursor;
    if (!result.hasMore) break;
  } while (cursor);
  return paths;
}

async function readFilesystemJson<T>(pathname: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filesystemPath(pathname), "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeFilesystemText(pathname: string, body: string): Promise<void> {
  const path = filesystemPath(pathname);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body, "utf8");
}

async function listFilesystemPaths(prefix: string): Promise<string[]> {
  const dir = filesystemPath(prefix);
  try {
    const names = await readdir(dir);
    return names.filter((name) => name.endsWith(".json")).map((name) => `${prefix}${name}`);
  } catch {
    return [];
  }
}

function filesystemRoot(): string {
  const configured = process.env.WIRE_CLOUD_DIR;
  return configured ? resolve(configured) : join(tmpdir(), "wire-playground-cloud");
}

function filesystemPath(pathname: string): string {
  const root = filesystemRoot();
  const path = resolve(root, pathname);
  const rel = relative(root, path);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Invalid cloud storage path.");
  return path;
}
