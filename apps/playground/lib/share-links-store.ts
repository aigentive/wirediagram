import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { put } from "@vercel/blob";
import { parseWireDiagram, type WireDiagram } from "@aigentive/wire-core";
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
  if (!path.startsWith(root)) throw new Error("Invalid share-link storage path.");
  return path;
}

function publicBlobUrl(pathname: string): string {
  const base = process.env.BLOB_PUBLIC_BASE_URL;
  if (!base) throw new Error("BLOB_PUBLIC_BASE_URL is required for public Blob reads.");
  return `${base.replace(/\/$/, "")}/${pathname}`;
}

function sharePath(token: string): string {
  if (!TOKEN_RE.test(token)) throw new Error("Invalid share token.");
  return `${CLOUD_PREFIX}/share-links/${token}.json`;
}

async function readJson<T>(pathname: string): Promise<T | null> {
  if (useBlobStore()) {
    const res = await fetch(publicBlobUrl(pathname), { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Vercel Blob read failed (${res.status}).`);
    return (await res.json()) as T;
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
  pinRevision = false
}: {
  user: CurrentUser;
  wire: StoredWire;
  scope?: ShareScope;
  pinRevision?: boolean;
}): Promise<{
  view: ShareLinkRecord;
  edit: ShareLinkRecord | null;
}> {
  const now = new Date().toISOString();
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
    expiresAt: null,
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
      expiresAt: null,
      revokedAt: null
    };
    await writeJson(sharePath(edit.token), edit);
  }

  return { view, edit };
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
