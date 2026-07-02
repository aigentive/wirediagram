import { randomBytes, randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { recordAuthenticatedUser } from "@/lib/activity-store";
import { requireAppSecret } from "@/lib/app-secret";
import { listCloudPaths, readCloudJson, writeCloudText } from "@/lib/cloud-kv-store";
import type { CurrentUser } from "@/lib/current-user";
import { stableStringify } from "@/lib/wire-canonical";

export type ApiKeyScope = "wires:read" | "wires:write" | "wires:delete";

export type ApiKeyRecord = {
  id: string;
  ownerKey: string;
  ownerEmail: string;
  name: string;
  prefix: string;
  secretHash: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type ApiKeySummary = Omit<ApiKeyRecord, "ownerKey" | "ownerEmail" | "secretHash">;

export type ApiKeyUser = CurrentUser & {
  apiKeyId: string;
  apiKeyName: string;
  apiKeyScopes: ApiKeyScope[];
};

const CLOUD_PREFIX = "wire-cloud/v2";
const API_KEY_ID_RE = /^ak_[A-Za-z0-9_-]+$/;
const OWNER_KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;
const API_KEY_PREFIX = "wire_sk_live_";
const DEFAULT_SCOPES: ApiKeyScope[] = ["wires:read", "wires:write", "wires:delete"];

function userApiKeysPrefix(user: CurrentUser): string {
  return `${CLOUD_PREFIX}/users/${user.key}/api-keys/`;
}

function apiKeyPath(ownerKey: string, id: string): string {
  if (!OWNER_KEY_RE.test(ownerKey) || !API_KEY_ID_RE.test(id)) {
    throw new Error("Invalid API key reference.");
  }
  return `${CLOUD_PREFIX}/users/${ownerKey}/api-keys/${id}.json`;
}

async function readJson<T>(pathname: string): Promise<T | null> {
  return readCloudJson<T>(pathname);
}

async function writeJson(pathname: string, value: unknown): Promise<void> {
  await writeCloudText(pathname, stableStringify(value));
}

async function listApiKeyPaths(user: CurrentUser): Promise<string[]> {
  return listCloudPaths(userApiKeysPrefix(user));
}

export async function listUserApiKeys(user: CurrentUser): Promise<ApiKeySummary[]> {
  const paths = await listApiKeyPaths(user);
  const records = await Promise.all(paths.map((path) => readJson<ApiKeyRecord>(path)));
  return records
    .filter((record): record is ApiKeyRecord => Boolean(record && record.ownerKey === user.key && !record.revokedAt))
    .map(toSummary)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createUserApiKey(
  user: CurrentUser,
  input: { name?: unknown; scopes?: unknown } = {}
): Promise<{ key: string; apiKey: ApiKeySummary }> {
  const id = `ak_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
  const secret = randomBytes(32).toString("base64url");
  const key = `${API_KEY_PREFIX}${user.key}.${id}.${secret}`;
  const now = new Date().toISOString();
  const record: ApiKeyRecord = {
    id,
    ownerKey: user.key,
    ownerEmail: user.email,
    name: cleanName(input.name) ?? "Local MCP",
    prefix: `${API_KEY_PREFIX}${user.key.slice(0, 8)}...${id.slice(-6)}`,
    secretHash: hashSecret(secret),
    scopes: cleanScopes(input.scopes),
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null
  };
  await writeJson(apiKeyPath(user.key, id), record);
  return { key, apiKey: toSummary(record) };
}

export async function revokeUserApiKey(user: CurrentUser, id: string): Promise<void> {
  const record = await readJson<ApiKeyRecord>(apiKeyPath(user.key, id));
  if (!record || record.ownerKey !== user.key || record.revokedAt) {
    throw new ApiKeyNotFoundError();
  }
  await writeJson(apiKeyPath(user.key, id), {
    ...record,
    revokedAt: new Date().toISOString()
  });
}

export async function requireApiKeyUser(
  req: Request,
  requiredScopes: ApiKeyScope[] = ["wires:read"]
): Promise<ApiKeyUser | Response> {
  const token = readBearerToken(req);
  if (!token) {
    return Response.json({ error: "API key required. Send Authorization: Bearer <wire API key>." }, { status: 401 });
  }

  const parsed = parseApiKey(token);
  if (!parsed) return Response.json({ error: "Invalid API key." }, { status: 401 });

  const record = await readJson<ApiKeyRecord>(apiKeyPath(parsed.ownerKey, parsed.id));
  if (!record || record.revokedAt || record.ownerKey !== parsed.ownerKey || record.id !== parsed.id) {
    return Response.json({ error: "Invalid API key." }, { status: 401 });
  }
  if (!constantTimeEqual(record.secretHash, hashSecret(parsed.secret))) {
    return Response.json({ error: "Invalid API key." }, { status: 401 });
  }
  if (!requiredScopes.every((scope) => record.scopes.includes(scope))) {
    return Response.json({ error: "API key scope is not allowed for this operation." }, { status: 403 });
  }

  const latest = await readJson<ApiKeyRecord>(apiKeyPath(record.ownerKey, record.id));
  if (latest && !latest.revokedAt) {
    await writeJson(apiKeyPath(record.ownerKey, record.id), {
      ...latest,
      lastUsedAt: new Date().toISOString()
    });
  }

  const user = {
    key: record.ownerKey,
    email: record.ownerEmail,
    name: null,
    image: null,
    apiKeyId: record.id,
    apiKeyName: record.name,
    apiKeyScopes: record.scopes
  };
  await recordAuthenticatedUser(user, { source: "api-key" });
  return user;
}

export class ApiKeyNotFoundError extends Error {
  constructor() {
    super("API key not found.");
  }
}

function toSummary(record: ApiKeyRecord): ApiKeySummary {
  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    scopes: record.scopes,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    revokedAt: record.revokedAt
  };
}

function readBearerToken(req: Request): string | null {
  const authorization = req.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;
  return req.headers.get("x-wire-api-key")?.trim() ?? null;
}

function parseApiKey(value: string): { ownerKey: string; id: string; secret: string } | null {
  if (!value.startsWith(API_KEY_PREFIX)) return null;
  const rest = value.slice(API_KEY_PREFIX.length);
  const [ownerKey, id, secret, extra] = rest.split(".");
  if (extra !== undefined || !ownerKey || !id || !secret) return null;
  if (!OWNER_KEY_RE.test(ownerKey) || !API_KEY_ID_RE.test(id) || secret.length < 32) return null;
  return { ownerKey, id, secret };
}

function hashSecret(secret: string): string {
  const hmacSecret = requireAppSecret("API key hashing");
  return createHmac("sha256", hmacSecret).update(secret).digest("base64url");
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 80) : null;
}

function cleanScopes(value: unknown): ApiKeyScope[] {
  if (!Array.isArray(value)) return DEFAULT_SCOPES;
  const scopes = value.filter((scope): scope is ApiKeyScope =>
    scope === "wires:read" || scope === "wires:write" || scope === "wires:delete"
  );
  return scopes.length > 0 ? Array.from(new Set(scopes)) : DEFAULT_SCOPES;
}
