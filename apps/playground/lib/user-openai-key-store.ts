import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { deleteCloudValue, readCloudJson, writeCloudText } from "@/lib/cloud-kv-store";
import type { CurrentUser } from "@/lib/current-user";
import { getDbClient, shouldUseDatabaseStore } from "@/lib/db/client";
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
  freeQuotaLimit?: number;
  freeQuotaUsed?: number;
  freeQuotaRemaining?: number;
  freeQuotaExhausted?: boolean;
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
  await writeEncryptedToDb(user, record);
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
  await deleteEncryptedFromDb(user);
  await deleteCloudValue(keyPath(user));
}

async function readEncrypted(user: CurrentUser): Promise<EncryptedRecord | null> {
  return await readEncryptedFromDb(user) ?? await readJson<EncryptedRecord>(keyPath(user));
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

async function readJson<T>(pathname: string): Promise<T | null> {
  return readCloudJson<T>(pathname);
}

async function writeJson(pathname: string, value: unknown): Promise<void> {
  await writeCloudText(pathname, stableStringify(value));
}

async function readEncryptedFromDb(user: CurrentUser): Promise<EncryptedRecord | null> {
  if (!shouldUseDatabaseStore()) return null;
  try {
    const db = await getDbClient();
    const result = await db.execute({
      sql: `
SELECT version, iv, auth_tag, ciphertext, last4, created_at, updated_at
FROM wire_user_openai_keys
WHERE user_key = ?
`,
      args: [user.key]
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const iv = stringValue(row.iv);
    const authTag = stringValue(row.auth_tag);
    const ciphertext = stringValue(row.ciphertext);
    const last4 = stringValue(row.last4);
    const createdAt = stringValue(row.created_at);
    const updatedAt = stringValue(row.updated_at);
    if (!iv || !authTag || !ciphertext || !last4 || !createdAt || !updatedAt) return null;
    return {
      v: 1,
      iv,
      authTag,
      ciphertext,
      last4,
      createdAt,
      updatedAt
    };
  } catch {
    return null;
  }
}

async function writeEncryptedToDb(user: CurrentUser, record: EncryptedRecord): Promise<void> {
  if (!shouldUseDatabaseStore()) return;
  const db = await getDbClient();
  await db.execute({
    sql: `
INSERT INTO wire_user_openai_keys (
  user_key,
  version,
  iv,
  auth_tag,
  ciphertext,
  last4,
  created_at,
  updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(user_key) DO UPDATE SET
  version = excluded.version,
  iv = excluded.iv,
  auth_tag = excluded.auth_tag,
  ciphertext = excluded.ciphertext,
  last4 = excluded.last4,
  updated_at = excluded.updated_at
`,
    args: [
      user.key,
      record.v,
      record.iv,
      record.authTag,
      record.ciphertext,
      record.last4,
      record.createdAt,
      record.updatedAt
    ]
  });
}

async function deleteEncryptedFromDb(user: CurrentUser): Promise<void> {
  if (!shouldUseDatabaseStore()) return;
  const db = await getDbClient();
  await db.execute({
    sql: "DELETE FROM wire_user_openai_keys WHERE user_key = ?",
    args: [user.key]
  });
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}
