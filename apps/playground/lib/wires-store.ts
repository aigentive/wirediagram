import { randomUUID } from "node:crypto";
import {
  parseWireDiagram,
  validate,
  type ValidationResult,
  type WireDiagram
} from "@aigentive/wire-core";
import { listCloudPaths, readCloudJson, writeCloudText } from "@/lib/cloud-kv-store";
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

function wirePath(user: CurrentUser, wireId: string): string {
  if (!WIRE_ID_RE.test(wireId)) throw new Error("Invalid wire id.");
  return `${CLOUD_PREFIX}/users/${user.key}/wires/${wireId}.json`;
}

function userWiresPrefix(user: CurrentUser): string {
  return `${CLOUD_PREFIX}/users/${user.key}/wires/`;
}

async function readJson<T>(pathname: string): Promise<T | null> {
  return readCloudJson<T>(pathname, { bustCache: true });
}

async function writeJson(pathname: string, value: unknown): Promise<void> {
  await writeCloudText(pathname, stableStringify(value));
}

async function listWirePaths(user: CurrentUser): Promise<string[]> {
  return listCloudPaths(userWiresPrefix(user));
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
  const wires = await Promise.all(paths.map((path) => safeReadStoredWire(path)));
  return wires
    .map((wire) => summaryForStoredWire(user, wire))
    .filter((wire): wire is WireSummary => Boolean(wire))
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
      ...storedWireVersions(latest),
      {
        id: randomUUID(),
        token: shared.token,
        source,
        summary: summary ?? null,
        createdAt: now
      }
    ].slice(-100),
    chatMessages: [...storedWireChatMessages(latest), ...chatMessages].slice(-100)
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
    title: typeof wire.title === "string" && wire.title.trim() ? wire.title : "Untitled wire",
    currentToken: typeof wire.currentToken === "string" ? wire.currentToken : "",
    nodeCount: Number.isFinite(wire.nodeCount) ? wire.nodeCount : Array.isArray(wire.diagram?.nodes) ? wire.diagram.nodes.length : 0,
    createdAt: typeof wire.createdAt === "string" && wire.createdAt ? wire.createdAt : new Date(0).toISOString(),
    updatedAt: typeof wire.updatedAt === "string" && wire.updatedAt ? wire.updatedAt : new Date(0).toISOString()
  };
}

async function safeReadStoredWire(pathname: string): Promise<StoredWire | null> {
  try {
    return await readJson<StoredWire>(pathname);
  } catch {
    return null;
  }
}

function summaryForStoredWire(user: CurrentUser, wire: StoredWire | null): WireSummary | null {
  if (!wire || wire.ownerKey !== user.key || wire.isDeleted) return null;
  if (typeof wire.id !== "string" || !WIRE_ID_RE.test(wire.id)) return null;
  const updatedAt = typeof wire.updatedAt === "string" && wire.updatedAt ? wire.updatedAt : new Date(0).toISOString();
  const createdAt = typeof wire.createdAt === "string" && wire.createdAt ? wire.createdAt : updatedAt;
  return {
    id: wire.id,
    title: typeof wire.title === "string" && wire.title.trim() ? wire.title : "Untitled wire",
    currentToken: typeof wire.currentToken === "string" ? wire.currentToken : "",
    nodeCount: Number.isFinite(wire.nodeCount) ? wire.nodeCount : Array.isArray(wire.diagram?.nodes) ? wire.diagram.nodes.length : 0,
    createdAt,
    updatedAt
  };
}

function storedWireVersions(wire: StoredWire): WireVersion[] {
  return Array.isArray(wire.versions) ? wire.versions : [];
}

function storedWireChatMessages(wire: StoredWire): StoredChatMessage[] {
  return Array.isArray(wire.chatMessages) ? wire.chatMessages : [];
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

function titleForSave(existingTitle: string, diagramTitle: unknown, _source: WireSaveSource): string {
  return cleanTitle(diagramTitle) ?? existingTitle;
}
