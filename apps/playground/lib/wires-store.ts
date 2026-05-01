import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { list, put } from "@vercel/blob";
import {
  parseWireDiagram,
  validate,
  type ValidationResult,
  type WireDiagram
} from "@aigentive/wire-core";
import type { CurrentUser } from "@/lib/current-user";
import { resolveShareToken } from "@/lib/share-store";
import { persistSharedDiagram, stableStringify } from "@/lib/wire-canonical";

export type WireSummary = {
  id: string;
  title: string;
  currentToken: string;
  nodeCount: number;
  updatedAt: string;
  createdAt: string;
};

export type WireVersion = {
  id: string;
  token: string;
  source: WireSaveSource;
  summary: string | null;
  createdAt: string;
};

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  costUsd: number | null;
  createdAt: string;
};

export type StoredWire = WireSummary & {
  ownerKey: string;
  ownerEmail?: string;
  diagram?: WireDiagram;
  lastClientMutationId?: number;
  isDeleted: boolean;
  versions: WireVersion[];
  chatMessages: StoredChatMessage[];
};

export type WireSaveSource = "manual" | "chat" | "json" | "reset" | "rename" | "create";

const CLOUD_PREFIX = "wire-cloud/v2";
const WIRE_ID_RE = /^[A-Za-z0-9_-]+$/;

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

function wirePath(user: CurrentUser, wireId: string): string {
  if (!WIRE_ID_RE.test(wireId)) throw new Error("Invalid wire id.");
  return `${CLOUD_PREFIX}/users/${user.key}/wires/${wireId}.json`;
}

function userWiresPrefix(user: CurrentUser): string {
  return `${CLOUD_PREFIX}/users/${user.key}/wires/`;
}

function publicBlobUrl(pathname: string): string {
  const base = process.env.BLOB_PUBLIC_BASE_URL;
  if (!base) throw new Error("BLOB_PUBLIC_BASE_URL is required for public Blob reads.");
  return `${base.replace(/\/$/, "")}/${pathname}`;
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

async function listWirePaths(user: CurrentUser): Promise<string[]> {
  const prefix = userWiresPrefix(user);
  if (useBlobStore()) {
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

  const dir = localPath(prefix);
  try {
    const names = await readdir(dir);
    return names.filter((name) => name.endsWith(".json")).map((name) => `${prefix}${name}`);
  } catch {
    return [];
  }
}

export function blankWireDiagram(wireId: string, title: string): WireDiagram {
  return {
    version: 1,
    id: wireId,
    title,
    layout: "LR",
    nodes: [],
    edges: []
  };
}

export async function listUserWires(user: CurrentUser): Promise<WireSummary[]> {
  const paths = await listWirePaths(user);
  const wires = await Promise.all(paths.map((path) => readJson<StoredWire>(path)));
  return wires
    .filter((wire): wire is StoredWire => Boolean(wire && wire.ownerKey === user.key && !wire.isDeleted))
    .map(toSummary)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createUserWire(user: CurrentUser, requestedTitle?: string): Promise<{
  wire: StoredWire;
  diagram: WireDiagram;
  validation: ValidationResult;
}> {
  const id = `wire_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
  const title = cleanTitle(requestedTitle) ?? "Untitled wire";
  const diagram = blankWireDiagram(id, title);
  return createStoredWire(user, diagram, "Created wire.");
}

export async function createUserWireFromDiagram(
  user: CurrentUser,
  input: unknown,
  options: { preserveId?: boolean; wireId?: string; summary?: string } = {}
): Promise<{
  wire: StoredWire;
  diagram: WireDiagram;
  validation: ValidationResult;
}> {
  const id = `wire_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
  const parsed = parseWireDiagram(input);
  const title = cleanTitle(parsed.title) ?? "Imported wire";
  const requestedId = options.wireId ?? (options.preserveId ? parsed.id : undefined);
  const diagramId = typeof requestedId === "string" && WIRE_ID_RE.test(requestedId) ? requestedId : id;
  const diagram = { ...parsed, id: diagramId, title };
  return createStoredWire(user, diagram, options.summary ?? "Imported from playground.");
}

async function createStoredWire(user: CurrentUser, diagram: WireDiagram, summary: string): Promise<{
  wire: StoredWire;
  diagram: WireDiagram;
  validation: ValidationResult;
}> {
  const wireId = diagram.id ?? `wire_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
  const storedDiagram = { ...diagram, id: wireId };
  const shared = await persistSharedDiagram(storedDiagram);
  const now = new Date().toISOString();
  const wire: StoredWire = {
    id: wireId,
    ownerKey: user.key,
    title: cleanTitle(storedDiagram.title) ?? "Untitled wire",
    currentToken: shared.token,
    nodeCount: storedDiagram.nodes.length,
    diagram: storedDiagram,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    versions: [
      {
        id: randomUUID(),
        token: shared.token,
        source: "create",
        summary,
        createdAt: now
      }
    ],
    chatMessages: []
  };
  await writeJson(wirePath(user, wireId), wire);
  return { wire, diagram: storedDiagram, validation: validate(storedDiagram) };
}

export async function loadUserWire(user: CurrentUser, wireId: string): Promise<{
  wire: StoredWire;
  diagram: WireDiagram;
  validation: ValidationResult;
} | null> {
  const wire = await readJson<StoredWire>(wirePath(user, wireId));
  if (!wire || wire.ownerKey !== user.key || wire.isDeleted) return null;
  const raw = wire.diagram ?? await resolveShareToken(wire.currentToken);
  if (!raw) throw new Error("Stored wire diagram could not be found.");
  const diagram = parseWireDiagram(raw);
  return { wire, diagram, validation: validate(diagram) };
}

export async function saveUserWire({
  user,
  wireId,
  diagram,
  source,
  summary,
  clientMutationId,
  chatMessages = []
}: {
  user: CurrentUser;
  wireId: string;
  diagram: unknown;
  source: WireSaveSource;
  summary?: string | null;
  clientMutationId?: number;
  chatMessages?: StoredChatMessage[];
}): Promise<{
  wire: StoredWire;
  diagram: WireDiagram;
  validation: ValidationResult;
}> {
  const existing = await readJson<StoredWire>(wirePath(user, wireId));
  if (!existing || existing.ownerKey !== user.key || existing.isDeleted) {
    throw new WireNotFoundError();
  }
  if (isStaleClientMutation(existing, clientMutationId)) {
    return materializeStoredWire(existing);
  }

  const shared = await persistSharedDiagram(diagram);
  const latest = await readJson<StoredWire>(wirePath(user, wireId));
  if (!latest || latest.ownerKey !== user.key || latest.isDeleted) {
    throw new WireNotFoundError();
  }
  if (isStaleClientMutation(latest, clientMutationId)) {
    return materializeStoredWire(latest);
  }
  const nextDiagram = shared.diagram;
  const now = new Date().toISOString();
  const validation = validate(nextDiagram);
  const next: StoredWire = {
    ...latest,
    title: titleForSave(latest.title, nextDiagram.title, source),
    currentToken: shared.token,
    nodeCount: nextDiagram.nodes.length,
    diagram: nextDiagram,
    lastClientMutationId: clientMutationId ?? latest.lastClientMutationId,
    updatedAt: now,
    versions: [
      ...latest.versions,
      {
        id: randomUUID(),
        token: shared.token,
        source,
        summary: summary ?? null,
        createdAt: now
      }
    ].slice(-100),
    chatMessages: [...latest.chatMessages, ...chatMessages].slice(-100)
  };
  await writeJson(wirePath(user, wireId), next);
  return { wire: next, diagram: nextDiagram, validation };
}

export async function renameUserWire(user: CurrentUser, wireId: string, title: string): Promise<{
  wire: StoredWire;
  diagram: WireDiagram;
  validation: ValidationResult;
}> {
  const loaded = await loadUserWire(user, wireId);
  if (!loaded) {
    throw new WireNotFoundError();
  }
  const nextTitle = cleanTitle(title) ?? loaded.wire.title;
  return saveUserWire({
    user,
    wireId,
    diagram: { ...loaded.diagram, title: nextTitle },
    source: "rename",
    summary: "Renamed wire."
  });
}

async function materializeStoredWire(wire: StoredWire): Promise<{
  wire: StoredWire;
  diagram: WireDiagram;
  validation: ValidationResult;
}> {
  const raw = wire.diagram ?? await resolveShareToken(wire.currentToken);
  if (!raw) throw new Error("Stored wire diagram could not be found.");
  const diagram = parseWireDiagram(raw);
  return { wire, diagram, validation: validate(diagram) };
}

function isStaleClientMutation(wire: StoredWire, clientMutationId: number | undefined): boolean {
  return clientMutationId !== undefined &&
    typeof wire.lastClientMutationId === "number" &&
    clientMutationId <= wire.lastClientMutationId;
}

export async function deleteUserWire(user: CurrentUser, wireId: string): Promise<void> {
  const existing = await readJson<StoredWire>(wirePath(user, wireId));
  if (!existing || existing.ownerKey !== user.key || existing.isDeleted) {
    throw new WireNotFoundError();
  }
  await writeJson(wirePath(user, wireId), {
    ...existing,
    isDeleted: true,
    updatedAt: new Date().toISOString()
  });
}

export function toSummary(wire: StoredWire): WireSummary {
  return {
    id: wire.id,
    title: wire.title,
    currentToken: wire.currentToken,
    nodeCount: wire.nodeCount,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt
  };
}

export function makeChatMessage(
  role: "user" | "assistant",
  content: string,
  options: { model?: string | null; costUsd?: number | null } = {}
): StoredChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    model: options.model ?? null,
    costUsd: options.costUsd ?? null,
    createdAt: new Date().toISOString()
  };
}

export class WireNotFoundError extends Error {
  constructor() {
    super("Wire not found.");
  }
}

function cleanTitle(title: unknown): string | null {
  if (typeof title !== "string") return null;
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : null;
}

function titleForSave(existingTitle: string, diagramTitle: unknown, source: WireSaveSource): string {
  if (source === "manual" || source === "reset") return existingTitle;
  return cleanTitle(diagramTitle) ?? existingTitle;
}
