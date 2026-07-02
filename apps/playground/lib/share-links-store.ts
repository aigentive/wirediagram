import { randomBytes } from "node:crypto";
import { parseWireDiagram, type WireDiagram } from "@aigentive/wire-core";
import { listCloudPaths, readCloudJson, writeCloudText } from "@/lib/cloud-kv-store";
import type { CurrentUser } from "@/lib/current-user";
import { resolveShareToken } from "@/lib/share-store";
import { stableStringify } from "@/lib/wire-canonical";
import {
  loadUserWire,
  saveUserWire,
  toSummary,
  type StoredWire
} from "@/lib/wires-store";

export type ShareScope = "view" | "edit";

export type ShareLinkRecord = {
  token: string;
  scope: ShareScope;
  ownerKey: string;
  wireId: string;
  contentToken: string | null;
  viewToken: string | null;
  pinned: boolean;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type ResolvedShare = {
  record: ShareLinkRecord | null;
  diagram: WireDiagram;
  wire: StoredWire | null;
  legacyToken: string | null;
};

export type ShareUrls = {
  view: string;
  edit: string | null;
  svg: string;
  png: string;
  json: string;
  mermaid: string;
  workspace: string | null;
};

const CLOUD_PREFIX = "wire-cloud/v2";
const TOKEN_RE = /^[A-Za-z0-9_-]{8,96}$/;
const EDIT_SHARE_WRITE_WINDOW_MS = 60_000;
const DEFAULT_EDIT_SHARE_WRITE_LIMIT = 30;

type ShareWriteRateRecord = {
  token: string;
  count: number;
  resetAt: string;
};

function sharePath(token: string): string {
  if (!TOKEN_RE.test(token)) throw new Error("Invalid share token.");
  return `${CLOUD_PREFIX}/share-links/${token}.json`;
}

function shareLinksPrefix(): string {
  return `${CLOUD_PREFIX}/share-links/`;
}

function shareWriteRatePath(token: string): string {
  if (!TOKEN_RE.test(token)) throw new Error("Invalid share token.");
  return `${CLOUD_PREFIX}/share-edit-rate/${token}.json`;
}

async function readJson<T>(pathname: string): Promise<T | null> {
  return readCloudJson<T>(pathname);
}

async function writeJson(pathname: string, value: unknown): Promise<void> {
  await writeCloudText(pathname, stableStringify(value));
}

function makeToken(): string {
  return randomBytes(18).toString("base64url");
}

function ownerUser(record: Pick<ShareLinkRecord, "ownerKey">): CurrentUser {
  return {
    key: record.ownerKey,
    email: "shared-wire@local",
    name: null,
    image: null
  };
}

function isUsable(record: ShareLinkRecord): boolean {
  if (record.revokedAt) return false;
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return false;
  return true;
}

export async function createWireShareLinks({
  user,
  wire,
  scope = "view",
  pinRevision = false,
  expiresAt = null
}: {
  user: CurrentUser;
  wire: StoredWire;
  scope?: ShareScope;
  pinRevision?: boolean;
  expiresAt?: string | null;
}): Promise<{
  view: ShareLinkRecord;
  edit: ShareLinkRecord | null;
}> {
  const now = new Date().toISOString();
  const normalizedExpiresAt = normalizeExpiresAt(expiresAt);
  const viewToken = makeToken();
  const view: ShareLinkRecord = {
    token: viewToken,
    scope: "view",
    ownerKey: user.key,
    wireId: wire.id,
    contentToken: pinRevision ? wire.currentToken : null,
    viewToken,
    pinned: pinRevision,
    createdAt: now,
    expiresAt: normalizedExpiresAt,
    revokedAt: null
  };

  await writeJson(sharePath(view.token), view);

  let edit: ShareLinkRecord | null = null;
  if (scope === "edit") {
    edit = {
      token: makeToken(),
      scope: "edit",
      ownerKey: user.key,
      wireId: wire.id,
      contentToken: null,
      viewToken,
      pinned: false,
      createdAt: now,
      expiresAt: normalizedExpiresAt,
      revokedAt: null
    };
    await writeJson(sharePath(edit.token), edit);
  }

  return { view, edit };
}

export async function listWireShareLinks(user: CurrentUser, wireId: string): Promise<ShareLinkRecord[]> {
  const paths = await listCloudPaths(shareLinksPrefix());
  const records = await Promise.all(paths.map((path) => readJson<ShareLinkRecord>(path)));
  return records
    .filter((record): record is ShareLinkRecord =>
      Boolean(record && record.ownerKey === user.key && record.wireId === wireId)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeWireShareLink(
  user: CurrentUser,
  token: string,
  options: { wireId?: string } = {}
): Promise<ShareLinkRecord> {
  if (!TOKEN_RE.test(token)) throw new Error("Invalid share token.");
  const record = await readJson<ShareLinkRecord>(sharePath(token));
  if (!record || record.ownerKey !== user.key || (options.wireId && record.wireId !== options.wireId)) {
    throw new Error("Share link not found.");
  }
  const revoked: ShareLinkRecord = {
    ...record,
    revokedAt: record.revokedAt ?? new Date().toISOString()
  };
  await writeJson(sharePath(token), revoked);
  return revoked;
}

export async function readShareLink(token: string): Promise<ShareLinkRecord | null> {
  if (!TOKEN_RE.test(token)) return null;
  const record = await readJson<ShareLinkRecord>(sharePath(token));
  if (!record || record.token !== token || !isUsable(record)) return null;
  return record;
}

export async function resolvePublicShare(token: string, requiredScope: ShareScope = "view"): Promise<ResolvedShare | null> {
  if (!TOKEN_RE.test(token)) return null;

  const record = await readShareLink(token);
  if (record) {
    if (requiredScope === "edit" && record.scope !== "edit") return null;

    if (record.contentToken) {
      const pinned = await resolveShareToken(record.contentToken);
      if (!pinned) return null;
      return {
        record,
        diagram: parseWireDiagram(pinned),
        wire: null,
        legacyToken: null
      };
    }

    const loaded = await loadUserWire(ownerUser(record), record.wireId);
    if (!loaded) return null;
    return {
      record,
      diagram: loaded.diagram,
      wire: loaded.wire,
      legacyToken: null
    };
  }

  if (requiredScope === "edit") return null;
  const legacy = await resolveShareToken(token);
  if (!legacy) return null;
  return {
    record: null,
    diagram: parseWireDiagram(legacy),
    wire: null,
    legacyToken: token
  };
}

export async function saveEditableShare(token: string, diagram: unknown): Promise<ResolvedShare> {
  const record = await readShareLink(token);
  if (!record || record.scope !== "edit") {
    throw new Error("Edit share not found.");
  }
  await assertEditShareWriteAllowed(token);

  const saved = await saveUserWire({
    user: ownerUser(record),
    wireId: record.wireId,
    diagram,
    source: "manual",
    summary: "Updated from public edit share."
  });

  return {
    record,
    diagram: saved.diagram,
    wire: saved.wire,
    legacyToken: null
  };
}

export class ShareRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Edit share write limit reached.");
  }
}

async function assertEditShareWriteAllowed(token: string): Promise<void> {
  const limit = editShareWriteLimit();
  if (limit <= 0) return;

  const now = Date.now();
  const path = shareWriteRatePath(token);
  const existing = await readJson<ShareWriteRateRecord>(path);
  const resetAtMs = existing?.resetAt ? Date.parse(existing.resetAt) : Number.NaN;
  if (existing && Number.isFinite(resetAtMs) && resetAtMs > now) {
    if (existing.count >= limit) {
      throw new ShareRateLimitError(Math.max(1, Math.ceil((resetAtMs - now) / 1000)));
    }
    await writeJson(path, { ...existing, count: existing.count + 1 });
    return;
  }

  await writeJson(path, {
    token,
    count: 1,
    resetAt: new Date(now + EDIT_SHARE_WRITE_WINDOW_MS).toISOString()
  } satisfies ShareWriteRateRecord);
}

function editShareWriteLimit(): number {
  const raw = process.env.WIRE_EDIT_SHARE_WRITE_LIMIT;
  if (!raw) return DEFAULT_EDIT_SHARE_WRITE_LIMIT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : DEFAULT_EDIT_SHARE_WRITE_LIMIT;
}

function normalizeExpiresAt(value: string | null): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error("Invalid share expiration.");
  return new Date(ms).toISOString();
}

export function shareUrls(origin: string, share: {
  viewToken: string;
  editToken?: string | null;
  wireId?: string | null;
}): ShareUrls {
  const base = origin.replace(/\/$/, "");
  const view = `${base}/s/${share.viewToken}`;
  return {
    view,
    edit: share.editToken ? `${base}/e/${share.editToken}` : null,
    svg: `${view}.svg`,
    png: `${view}.png`,
    json: `${view}.json`,
    mermaid: `${view}.mmd`,
    workspace: share.wireId ? `${base}/wires/${encodeURIComponent(share.wireId)}` : null
  };
}

export function publicSharePayload(origin: string, args: {
  wire: StoredWire;
  view: ShareLinkRecord;
  edit: ShareLinkRecord | null;
  legacyToken?: string | null;
}) {
  const urls = shareUrls(origin, {
    viewToken: args.view.token,
    editToken: args.edit?.token ?? null,
    wireId: args.wire.id
  });
  return {
    token: args.view.token,
    viewToken: args.view.token,
    editToken: args.edit?.token ?? null,
    scope: args.edit ? "edit" : "view",
    pinned: args.view.pinned,
    urls,
    previewUrl: urls.view,
    editUrl: urls.edit,
    svgUrl: urls.svg,
    pngUrl: urls.png,
    jsonUrl: urls.json,
    mermaidUrl: urls.mermaid,
    workspaceUrl: urls.workspace,
    legacyToken: args.legacyToken ?? args.wire.currentToken,
    legacyPreviewUrl: `${origin.replace(/\/$/, "")}/preview/inline?d=${args.legacyToken ?? args.wire.currentToken}`,
    wire: toSummary(args.wire)
  };
}
