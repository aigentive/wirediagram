import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { put, del } from "@vercel/blob";
import { readBlobJson } from "@/lib/blob-json";
import type { CurrentUser } from "@/lib/current-user";
import { stableStringify } from "@/lib/wire-canonical";

type EncryptedRecord = {
  v: 1;
  iv: string;
  authTag: string;
  ciphertext: string;
  last4: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredKeyMeta = {
  configured: boolean;
  last4: string | null;
  updatedAt: string | null;
};

const CLOUD_PREFIX = "wire-cloud/v2";
const HKDF_INFO = Buffer.from("wire-playground/openai-key/v1");
const ENCRYPTION_KEY_LENGTH = 32;

export async function setUserOpenAIKey(user: CurrentUser, plainKey: string): Promise<StoredKeyMeta> {
  const trimmed = plainKey.trim();
  if (!trimmed.startsWith("sk-") || trimmed.length < 20) {
    throw new Error("OpenAI API key must start with sk- and be at least 20 characters.");
  }
  const now = new Date().toISOString();
  const existing = await readEncrypted(user);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(user.key), iv);
  const ciphertext = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const record: EncryptedRecord = {
    v: 1,
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    last4: trimmed.slice(-4),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  await writeJson(keyPath(user), record);
  return { configured: true, last4: record.last4, updatedAt: record.updatedAt };
}

export async function getUserOpenAIKey(user: CurrentUser): Promise<string | null> {
  const record = await readEncrypted(user);
  if (!record) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(user.key), Buffer.from(record.iv, "base64url"));
    decipher.setAuthTag(Buffer.from(record.authTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(record.ciphertext, "base64url")),
      decipher.final()
    ]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}

export async function getUserOpenAIKeyMeta(user: CurrentUser): Promise<StoredKeyMeta> {
  const record = await readEncrypted(user);
  if (!record) return { configured: false, last4: null, updatedAt: null };
  return { configured: true, last4: record.last4, updatedAt: record.updatedAt };
}

export async function deleteUserOpenAIKey(user: CurrentUser): Promise<void> {
  const path = keyPath(user);
  if (useBlobStore()) {
    try {
      await del(path);
    } catch {
      // Already gone is fine.
    }
    return;
  }
  try {
    await unlink(localPath(path));
  } catch {
    // Already gone is fine.
  }
}

async function readEncrypted(user: CurrentUser): Promise<EncryptedRecord | null> {
  return readJson<EncryptedRecord>(keyPath(user));
}

function keyPath(user: CurrentUser): string {
  return `${CLOUD_PREFIX}/users/${user.key}/openai-key.json`;
}

function deriveKey(userKey: string): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "wire-local-dev-secret";
  const ikm = Buffer.from(secret, "utf8");
  const salt = Buffer.from(userKey, "utf8");
  const derived = hkdfSync("sha256", ikm, salt, HKDF_INFO, ENCRYPTION_KEY_LENGTH);
  return Buffer.from(derived);
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
