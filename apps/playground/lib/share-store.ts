import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/;

function shareDir(): string {
  const configured = process.env.WIRE_SHARE_DIR;
  return configured ? resolve(configured) : join(tmpdir(), "wire-playground-shares");
}

function sharePath(token: string): string | null {
  if (!TOKEN_RE.test(token)) return null;
  return join(shareDir(), `${token}.json`);
}

export async function readLocalShare(token: string): Promise<unknown | null> {
  const path = sharePath(token);
  if (!path) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

export async function writeLocalShare(token: string, canonical: string): Promise<void> {
  const path = sharePath(token);
  if (!path) throw new Error("Invalid share token");
  await mkdir(shareDir(), { recursive: true });
  await writeFile(path, canonical, "utf8");
}

export async function resolveShareToken(token: string): Promise<unknown | null> {
  const local = await readLocalShare(token);
  if (local) return local;

  const base = process.env.BLOB_PUBLIC_BASE_URL;
  if (!base) return null;
  const res = await fetch(`${base}/wires/${token}.json`, { cache: "force-cache" });
  if (!res.ok) return null;
  return res.json();
}
