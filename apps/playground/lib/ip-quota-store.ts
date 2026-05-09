import { createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { put } from "@vercel/blob";
import { readBlobJson } from "@/lib/blob-json";
import { stableStringify } from "@/lib/wire-canonical";

export const IP_QUOTA_LIMIT = 20;
export const USER_QUOTA_LIMIT = 20;

export type IpQuotaRecord = {
  hash: string;
  count: number;
  firstAt: string;
  lastAt: string;
};

export type UserQuotaRecord = {
  userKey: string;
  count: number;
  firstAt: string;
  lastAt: string;
};

const CLOUD_PREFIX = "wire-cloud/v2";
const HASH_RE = /^[A-Za-z0-9_-]{16,64}$/;
const USER_KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;

export function hashIp(rawIp: string): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "wire-local-dev-secret";
  return createHmac("sha256", secret).update(rawIp).digest("base64url").slice(0, 32);
}

export function resolveClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "local-dev";
}

export async function readIpQuota(hash: string): Promise<IpQuotaRecord | null> {
  if (!HASH_RE.test(hash)) return null;
  return readJson<IpQuotaRecord>(quotaPath(hash));
}

export async function incrementIpQuota(hash: string): Promise<IpQuotaRecord> {
  if (!HASH_RE.test(hash)) throw new Error("Invalid IP hash.");
  const now = new Date().toISOString();
  const existing = await readJson<IpQuotaRecord>(quotaPath(hash));
  const next: IpQuotaRecord = existing
    ? { ...existing, count: existing.count + 1, lastAt: now }
    : { hash, count: 1, firstAt: now, lastAt: now };
  await writeJson(quotaPath(hash), next);
  return next;
}

export async function readUserQuota(userKey: string): Promise<UserQuotaRecord | null> {
  if (!USER_KEY_RE.test(userKey)) return null;
  return readJson<UserQuotaRecord>(userQuotaPath(userKey));
}

export async function incrementUserQuota(userKey: string): Promise<UserQuotaRecord> {
  if (!USER_KEY_RE.test(userKey)) throw new Error("Invalid user key.");
  const now = new Date().toISOString();
  const existing = await readJson<UserQuotaRecord>(userQuotaPath(userKey));
  const next: UserQuotaRecord = existing
    ? { ...existing, count: existing.count + 1, lastAt: now }
    : { userKey, count: 1, firstAt: now, lastAt: now };
  await writeJson(userQuotaPath(userKey), next);
  return next;
}

function quotaPath(hash: string): string {
  return `${CLOUD_PREFIX}/ip-quota/${hash}.json`;
}

function userQuotaPath(userKey: string): string {
  return `${CLOUD_PREFIX}/user-quota/${userKey}.json`;
}

function useBlobStore(): boolean {
  return process.env.WIRE_CLOUD_BACKEND !== "local" && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function localRoot(): string {
  const configured = process.env.WIRE_CLOUD_DIR;
  return configured ? resolve(configured) : join(tmpdir(), "wire-playground-cloud");
}

function localPath(pathname: string): string {
  const root = localRoot();
  const path = resolve(root, pathname);
  if (!path.startsWith(root)) throw new Error("Invalid cloud storage path.");
  return path;
}

async function readJson<T>(pathname: string): Promise<T | null> {
  if (useBlobStore()) {
    return readBlobJson<T>(pathname);
  }
  try {
    return JSON.parse(await readFile(localPath(pathname), "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(pathname: string, value: unknown): Promise<void> {
  const body = stableStringify(value);
  if (useBlobStore()) {
    await put(pathname, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json"
    });
    return;
  }
  const path = localPath(pathname);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body, "utf8");
}
