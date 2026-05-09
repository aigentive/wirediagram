import {
  EdgeSchema,
  NodeSchema,
  splitFromRef,
  type EdgeLabelStyle,
  type EdgeRouting,
  type EdgeStyle,
  type NodeHandles,
  type NodeStyle,
  type Side,
  type WireDiagram,
  type WireNode,
  type WireEdge
} from "./schema.js";
import { generateNodeId } from "./ids.js";

/**
 * Pure, immutable diagram edits. All mutations return a new diagram.
 *
 * These are the primitives the MCP tools and the CLI both call into. Keeping
 * them pure lets us unit-test them without bringing in storage.
 */

function nodeIdsOf(diagram: WireDiagram): Set<string> {
  return new Set(diagram.nodes.map((n) => n.id));
}

export interface AddNodeInput {
  kind: WireNode["kind"];
  title: string;
  id?: string;
  description?: string;
  from?: string | string[];
  after?: string | string[];
  branch?: string;
  attachedTo?: string;
  tone?: WireNode["tone"];
  parent?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  style?: NodeStyle;
  handles?: NodeHandles;
  data?: Record<string, unknown>;
  // condition-specific
  branches?: string[];
  // ai-specific
  model?: string;
  prompt?: string;
  tools?: string[];
  // tool-specific
  ref?: string;
  // note-specific
  body?: string;
}

export function addNode(diagram: WireDiagram, input: AddNodeInput): { diagram: WireDiagram; node: WireNode } {
  const taken = nodeIdsOf(diagram);
  const id = generateNodeId({
    title: input.title,
    kind: input.kind,
    taken,
    preferredId: input.id
  });

  if (input.branch !== undefined && Array.isArray(input.from)) {
    throw new Error(
      "branch can only be combined with a single string `from`. Pass each branched ref directly in the array, e.g. from: ['a.yes', 'b.no']."
    );
  }
  const fromValue = input.branch && typeof input.from === "string"
    ? `${input.from}.${input.branch}`
    : input.from;

  const candidate: Record<string, unknown> = {
    id,
    kind: input.kind,
    title: input.title,
    description: input.description,
    from: fromValue,
    after: input.after,
    attachedTo: input.attachedTo,
    tone: input.tone,
    parent: input.parent,
    position: input.position,
    size: input.size,
    style: input.style,
    handles: input.handles,
    data: input.data
  };
  if (input.kind === "condition") candidate.branches = input.branches ?? [];
  if (input.kind === "ai") {
    candidate.model = input.model;
    candidate.prompt = input.prompt;
    candidate.tools = input.tools;
  }
  if (input.kind === "tool") candidate.ref = input.ref;
  if (input.kind === "note") candidate.body = input.body;

  const node = NodeSchema.parse(stripUndefined(candidate));
  return {
    diagram: { ...diagram, nodes: [...diagram.nodes, node] },
    node
  };
}

export function updateNode(
  diagram: WireDiagram,
  id: string,
  patch: Record<string, unknown>
): { diagram: WireDiagram; node: WireNode } {
  const idx = diagram.nodes.findIndex((n) => n.id === id);
  if (idx === -1) {
    throw new Error(`Node "${id}" not found.`);
  }
  const current = diagram.nodes[idx]!;
  // Treat `null` in `patch` as an explicit clear; `undefined` is ignored
  // (matches partial-patch idiom).
  const merged: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v === null) {
      delete merged[k];
    } else {
      merged[k] = v;
    }
  }
  merged.id = current.id;
  merged.kind = current.kind;
  const node = NodeSchema.parse(stripUndefined(merged));
  const nodes = [...diagram.nodes];
  nodes[idx] = node;
  return { diagram: { ...diagram, nodes }, node };
}

export function removeNode(
  diagram: WireDiagram,
  id: string
): { diagram: WireDiagram; removed: WireNode } {
  const removed = diagram.nodes.find((n) => n.id === id);
  if (!removed) {
    throw new Error(`Node "${id}" not found.`);
  }

  // Remove the node, prune edges referencing it, clean `from`/`after`
  // references on other nodes, and strip any group.children entries.
  const nodes = diagram.nodes
    .filter((n) => n.id !== id)
    .map((n) => pruneRefs(n, id));
  const edges = diagram.edges.filter(
    (e) => splitFromIdOnly(e.from) !== id && e.to !== id
  );

  return { diagram: { ...diagram, nodes, edges }, removed };
}

export interface ConnectInput {
  id?: string;
  from: string;
  to: string;
  branch?: string;
  label?: string;
  tone?: WireEdge["tone"];
  fromHandle?: Side;
  toHandle?: Side;
  style?: EdgeStyle;
  labelStyle?: EdgeLabelStyle;
  routing?: EdgeRouting;
  data?: Record<string, unknown>;
}

export function connect(diagram: WireDiagram, input: ConnectInput): WireDiagram {
  const targetIdx = diagram.nodes.findIndex((n) => n.id === input.to);
  if (targetIdx === -1) {
    throw new Error(`Target node "${input.to}" not found.`);
  }
  const parsedFrom = splitFromRef(input.from);
  const sourceId = parsedFrom.nodeId;
  const branch = input.branch ?? parsedFrom.branch;
  const source = diagram.nodes.find((n) => n.id === sourceId);
  if (!source) {
    throw new Error(`Source node "${sourceId}" not found.`);
  }
  const target = diagram.nodes[targetIdx]!;

  if (target.kind === "note") {
    throw new Error(
      `Notes cannot have edges. Use addNote({ attachedTo: "${sourceId}" }) for visual association.`
    );
  }

  if (branch) {
    if (source.kind !== "condition") {
      throw new Error(
        `Branch "${branch}" requires source "${sourceId}" to be a condition node, got "${source.kind}".`
      );
    }
    if (!source.branches.includes(branch)) {
      throw new Error(
        `Condition "${sourceId}" has no branch "${branch}". Known: ${source.branches.join(", ")}.`
      );
    }
  }

  const refValue = branch ? `${sourceId}.${branch}` : sourceId;
  const targetFroms = Array.isArray(target.from) ? target.from : target.from ? [target.from] : [];
  const needsExplicitEdge = hasExplicitEdgeFields(input);

  if (!needsExplicitEdge) {
    if (targetFroms.includes(refValue)) {
      return diagram; // already connected
    }
    const updated = NodeSchema.parse({
      ...target,
      from: targetFroms.length > 0 ? [...targetFroms, refValue] : refValue
    });
    const nodes = [...diagram.nodes];
    nodes[targetIdx] = updated;
    return { ...diagram, nodes };
  }

  // Explicit edge — preserves label/tone.
  const id = input.id ?? nextEdgeId(diagram, sourceId, input.to, branch);
  if (diagram.edges.some((e) => e.id === id)) return diagram;
  const edge = EdgeSchema.parse(stripUndefined({
    id,
    from: refValue,
    to: input.to,
    branch,
    label: input.label,
    tone: input.tone,
    fromHandle: input.fromHandle,
    toHandle: input.toHandle,
    style: input.style,
    labelStyle: input.labelStyle,
    routing: input.routing,
    data: input.data
  }));
  return {
    ...diagram,
    edges: [...diagram.edges, edge]
  };
}

export interface DisconnectInput {
  from: string;
  to: string;
  branch?: string;
}

export function disconnect(diagram: WireDiagram, input: DisconnectInput): WireDiagram {
  // When branch is supplied, we only remove that exact "id.branch" ref.
  // When branch is omitted, we remove ALL refs with that source id —
  // including any "id.branch" variants. Matches the user's intent of
  // "disconnect node X from Y" without having to enumerate branches.
  const matches = (ref: string): boolean => {
    const { nodeId, branch } = splitFromRef(ref);
    if (nodeId !== input.from) return false;
    if (input.branch === undefined) return true;
    return branch === input.branch;
  };
  const nodes = diagram.nodes.map((n) => {
    if (n.id !== input.to) return n;
    const fromArr = Array.isArray(n.from) ? n.from : n.from ? [n.from] : [];
    const filtered = fromArr.filter((r) => !matches(r));
    if (filtered.length === fromArr.length) return n;
    const next: Record<string, unknown> = { ...n };
    if (filtered.length === 0) {
      delete next.from;
    } else if (filtered.length === 1) {
      next.from = filtered[0];
    } else {
      next.from = filtered;
    }
    return NodeSchema.parse(next);
  });
  const edges = diagram.edges.filter((e) => {
    if (e.to !== input.to) return true;
    return !matches(e.from);
  });
  return { ...diagram, nodes, edges };
}

export function addNote(
  diagram: WireDiagram,
  input: { title: string; body?: string; attachedTo?: string; id?: string; tone?: WireNode["tone"] }
): { diagram: WireDiagram; node: WireNode } {
  return addNode(diagram, {
    kind: "note",
    title: input.title,
    body: input.body,
    attachedTo: input.attachedTo,
    id: input.id,
    tone: input.tone
  });
}

export function setLayout(
  diagram: WireDiagram,
  direction: WireDiagram["layout"],
  engine?: WireDiagram["layoutEngine"]
): WireDiagram {
  return { ...diagram, layout: direction, layoutEngine: engine ?? diagram.layoutEngine };
}

export function emptyDiagram(opts: { id?: string; title?: string; layout?: WireDiagram["layout"] } = {}): WireDiagram {
  const out: WireDiagram = {
    version: 1,
    layout: opts.layout ?? "LR",
    nodes: [],
    edges: []
  };
  if (opts.id !== undefined) out.id = opts.id;
  if (opts.title !== undefined) out.title = opts.title;
  return out;
}

// — internal helpers —

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function hasExplicitEdgeFields(input: ConnectInput): boolean {
  return Boolean(
    input.id ||
      input.label ||
      input.tone ||
      input.fromHandle ||
      input.toHandle ||
      input.style ||
      input.labelStyle ||
      input.routing ||
      input.data
  );
}

function nextEdgeId(
  diagram: WireDiagram,
  fromId: string,
  toId: string,
  branch?: string
): string {
  const seed = branch ? `${fromId}-${branch}-to-${toId}` : `${fromId}-to-${toId}`;
  const existing = new Set(diagram.edges.map((edge) => edge.id).filter((id): id is string => Boolean(id)));
  if (!existing.has(seed)) return seed;
  let counter = 2;
  while (existing.has(`${seed}-${counter}`)) counter += 1;
  return `${seed}-${counter}`;
}

function splitFromIdOnly(ref: string): string {
  const idx = ref.indexOf(".");
  return idx === -1 ? ref : ref.slice(0, idx);
}

function pruneRefs(node: WireNode, removedId: string): WireNode {
  const next: Record<string, unknown> = { ...node };
  const filterRef = (val: unknown): unknown => {
    if (typeof val === "string") {
      return splitFromIdOnly(val) === removedId ? undefined : val;
    }
    if (Array.isArray(val)) {
      const filtered = val.filter((v) => typeof v === "string" && splitFromIdOnly(v) !== removedId);
      if (filtered.length === 0) return undefined;
      if (filtered.length === 1) return filtered[0];
      return filtered;
    }
    return val;
  };
  next.from = filterRef(node.from);
  if ("after" in node) next.after = filterRef((node as { after?: unknown }).after);
  if (node.attachedTo === removedId) delete next.attachedTo;
  if (node.parent === removedId) delete next.parent;
  if (node.kind === "group" && Array.isArray(node.children)) {
    const remaining = node.children.filter((c) => c !== removedId);
    if (remaining.length === 0) {
      delete next.children;
    } else {
      next.children = remaining;
    }
  }
  // ai.tools may reference node ids
  if (node.kind === "ai" && Array.isArray(node.tools)) {
    const remaining = node.tools.filter((t) => t !== removedId);
    if (remaining.length === 0) {
      delete next.tools;
    } else {
      next.tools = remaining;
    }
  }
  return NodeSchema.parse(stripUndefined(next));
}
