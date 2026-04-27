import { z } from "zod";

/**
 * Wire canonical schema.
 *
 * This is the LLM-facing model. Every node is identified by `id`, every
 * connection is expressed as `from` (or `from: "{nodeId}.{branch}"` for
 * branching) or `attachedTo` (notes/annotations). We intentionally avoid
 * `connectsTo` because directionality reads ambiguously to LLMs.
 */

export const WIRE_SCHEMA_VERSION = 1;

export const LayoutDirectionSchema = z.enum(["LR", "TB", "RL", "BT"]);
export type LayoutDirection = z.infer<typeof LayoutDirectionSchema>;

export const LayoutEngineSchema = z.enum(["dagre", "elk"]).default("dagre");
export type LayoutEngine = z.infer<typeof LayoutEngineSchema>;

export const ToneSchema = z.enum([
  "default",
  "success",
  "warning",
  "error",
  "info",
  "ai"
]);
export type Tone = z.infer<typeof ToneSchema>;

export const NodeKindSchema = z.enum([
  "trigger",
  "action",
  "ai",
  "tool",
  "condition",
  "human",
  "memory",
  "retrieval",
  "guardrail",
  "end",
  "note",
  "group"
]);
export type NodeKind = z.infer<typeof NodeKindSchema>;

/** Anchor side of a node bounding box. */
export const SideSchema = z.enum(["left", "right", "top", "bottom"]);
export type Side = z.infer<typeof SideSchema>;

/** Edge end-cap markers. */
export const EdgeMarkerSchema = z.enum(["arrow", "circle", "diamond", "none"]);
export type EdgeMarker = z.infer<typeof EdgeMarkerSchema>;

/** Edge path routing strategy. */
export const EdgeRoutingSchema = z.enum(["bezier", "smoothstep", "step", "straight"]);
export type EdgeRouting = z.infer<typeof EdgeRoutingSchema>;

/**
 * Per-node visual overrides. All fields optional — when omitted, falls
 * back to tone-derived defaults. Renderers and adapters honor these
 * uniformly so the same diagram looks identical in SVG and React Flow.
 */
export const NodeStyleSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  strokeDasharray: z.string().optional(),
  borderRadius: z.number().nonnegative().optional(),
  opacity: z.number().min(0).max(1).optional(),
  shadow: z.boolean().optional(),
  textColor: z.string().optional()
});
export type NodeStyle = z.infer<typeof NodeStyleSchema>;

/**
 * Per-node handle map — declares which sides edges may anchor to.
 * Renderers also accept per-edge `fromHandle`/`toHandle` overrides which
 * take precedence over this list.
 */
export const NodeHandlesSchema = z.object({
  source: z.array(SideSchema).min(1).optional(),
  target: z.array(SideSchema).min(1).optional()
});
export type NodeHandles = z.infer<typeof NodeHandlesSchema>;

/** Per-edge stroke + marker + routing overrides. */
export const EdgeStyleSchema = z.object({
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  strokeDasharray: z.string().optional(),
  markerEnd: EdgeMarkerSchema.optional(),
  markerStart: EdgeMarkerSchema.optional(),
  /** Bezier curvature 0..1. 0 = straight, 1 = max bow. Default 0.5. */
  curvature: z.number().min(0).max(1).optional()
});
export type EdgeStyle = z.infer<typeof EdgeStyleSchema>;

/** Per-edge label background + text overrides. */
export const EdgeLabelStyleSchema = z.object({
  fill: z.string().optional(),
  background: z.string().optional(),
  border: z.string().optional(),
  fontSize: z.number().positive().optional()
});
export type EdgeLabelStyle = z.infer<typeof EdgeLabelStyleSchema>;

/**
 * Node ids must be slug-like: letters, numbers, hyphen, underscore. No
 * dots — they'd collide with the "{nodeId}.{branch}" syntax used in `from`.
 * No whitespace — would break Mermaid export and ref parsing.
 */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const Identifier = z
  .string()
  .min(1)
  .max(120)
  .regex(ID_PATTERN, "id must match /^[A-Za-z0-9_-]+$/ (no dots, spaces, or special chars)");

/** Branch names share the slug discipline so they cannot collide with `from` parsing. */
const BranchName = z
  .string()
  .min(1)
  .max(60)
  .regex(ID_PATTERN, "branch must match /^[A-Za-z0-9_-]+$/ (no dots, spaces, or special chars)");

const FromRef = z
  .string()
  .min(1)
  .regex(
    /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?$/,
    "from must be '<nodeId>' or '<nodeId>.<branch>' (slug chars only)"
  )
  .describe("Source reference. Either '{nodeId}' or '{nodeId}.{branch}' for condition nodes.");

const PositionSchema = z.object({
  x: z.number(),
  y: z.number()
}).optional();

const SizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive()
}).optional();

/** Common fields shared by all nodes. */
const BaseNodeFields = {
  id: Identifier,
  kind: NodeKindSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  tone: ToneSchema.optional(),
  /** Source-of-truth connection. Single value or non-empty array — array is sugar for "this node has multiple incoming edges". */
  from: z.union([FromRef, z.array(FromRef).min(1)]).optional(),
  /** Alias for `from`; preserved on round-trip but normalized to `from`. */
  after: z.union([FromRef, z.array(FromRef).min(1)]).optional(),
  /** For notes/annotations: the node this is attached to (no edge drawn — visual association only). */
  attachedTo: Identifier.optional(),
  /** For nodes inside a group. */
  parent: Identifier.optional(),
  /** Optional explicit layout hint. If absent, layout engine assigns. */
  position: PositionSchema,
  size: SizeSchema,
  /** Per-node visual overrides; falls back to tone defaults. */
  style: NodeStyleSchema.optional(),
  /** Allowed source/target handle sides. */
  handles: NodeHandlesSchema.optional(),
  /** Free-form payload — passed through unchanged. */
  data: z.record(z.string(), z.unknown()).optional()
};

export const TriggerNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("trigger")
});

export const ActionNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("action")
});

export const AINodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("ai"),
  model: z.string().optional(),
  prompt: z.string().optional(),
  tools: z.array(Identifier).optional()
});

export const ToolNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("tool"),
  /** Optional tool reference (mcp tool name, function name, etc.). */
  ref: z.string().optional()
});

export const ConditionNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("condition"),
  branches: z.array(BranchName).min(1)
});

export const HumanNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("human")
});

export const MemoryNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("memory")
});

export const RetrievalNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("retrieval")
});

export const GuardrailNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("guardrail")
});

export const EndNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("end")
});

export const NoteNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("note"),
  body: z.string().optional()
});

export const GroupNodeSchema = z.object({
  ...BaseNodeFields,
  kind: z.literal("group"),
  children: z.array(Identifier).optional()
});

export const NodeSchema = z.discriminatedUnion("kind", [
  TriggerNodeSchema,
  ActionNodeSchema,
  AINodeSchema,
  ToolNodeSchema,
  ConditionNodeSchema,
  HumanNodeSchema,
  MemoryNodeSchema,
  RetrievalNodeSchema,
  GuardrailNodeSchema,
  EndNodeSchema,
  NoteNodeSchema,
  GroupNodeSchema
]);
export type WireNode = z.infer<typeof NodeSchema>;

/**
 * Optional explicit edge. Most diagrams should not need this — `from` on
 * the target node is preferred. Use only when you need an extra label
 * or a non-tree connection that does not fit `from`.
 */
export const EdgeSchema = z.object({
  id: Identifier.optional(),
  from: FromRef,
  to: Identifier,
  branch: z.string().min(1).optional(),
  label: z.string().optional(),
  tone: ToneSchema.optional(),
  /** Pin the edge to a specific side of its source node. */
  fromHandle: SideSchema.optional(),
  /** Pin the edge to a specific side of its target node. */
  toHandle: SideSchema.optional(),
  /** Per-edge stroke + marker overrides. */
  style: EdgeStyleSchema.optional(),
  /** Per-edge label background/text overrides. */
  labelStyle: EdgeLabelStyleSchema.optional(),
  /** Routing strategy. Defaults to bezier (matches existing renderer). */
  routing: EdgeRoutingSchema.optional(),
  data: z.record(z.string(), z.unknown()).optional()
});
export type WireEdge = z.infer<typeof EdgeSchema>;

export const WireDiagramSchema = z.object({
  $schema: z.string().optional(),
  version: z.number().int().positive().default(WIRE_SCHEMA_VERSION),
  id: Identifier.optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  layout: LayoutDirectionSchema.default("LR"),
  layoutEngine: LayoutEngineSchema.optional(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).optional()
});
export type WireDiagram = z.infer<typeof WireDiagramSchema>;

/**
 * Fold `after` into `from` so downstream consumers only have to look at one
 * field. The original `after` is preserved on the node for round-trip
 * fidelity but is no longer source-of-truth for graph connectivity.
 */
function foldAfterIntoFrom(node: Record<string, unknown>): Record<string, unknown> {
  const after = node.after;
  const from = node.from;
  if (after === undefined) return node;

  const fromList = from === undefined ? [] : Array.isArray(from) ? from : [from];
  const afterList = Array.isArray(after) ? after : [after];
  const merged = [...fromList, ...afterList].filter(
    (v, i, arr) => typeof v === "string" && arr.indexOf(v) === i
  );

  const next: Record<string, unknown> = { ...node };
  if (merged.length === 0) delete next.from;
  else if (merged.length === 1) next.from = merged[0];
  else next.from = merged;
  return next;
}

/**
 * Forbidden top-level node fields. We strip these in preprocessing AND
 * stash a sidecar list so `validate()` can emit a stable warning code —
 * giving LLMs a clear "use `from` instead of `connectsTo`" repair hint
 * rather than silently dropping their (mis-spec'd) intent.
 */
const FORBIDDEN_NODE_FIELDS: ReadonlySet<string> = new Set([
  "connectsTo",
  "connects_to"
]);

export interface PreprocessSidecar {
  forbiddenFields: Array<{ nodeId: string; field: string }>;
}

const SIDECAR_KEY = Symbol.for("@aigentive/wire-core/preprocessSidecar");

function preprocessDiagram(input: unknown, sidecar?: PreprocessSidecar): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = input as Record<string, unknown>;
  if (!Array.isArray(obj.nodes)) return input;
  const nodes = obj.nodes.map((n) => {
    if (!n || typeof n !== "object") return n;
    const node = n as Record<string, unknown>;
    const folded = foldAfterIntoFrom(node);
    if (sidecar) {
      const id = typeof folded.id === "string" ? folded.id : "<unknown>";
      for (const banned of FORBIDDEN_NODE_FIELDS) {
        if (banned in folded) sidecar.forbiddenFields.push({ nodeId: id, field: banned });
      }
    }
    // Always strip forbidden fields so the discriminated union doesn't choke.
    for (const banned of FORBIDDEN_NODE_FIELDS) delete folded[banned];
    return folded;
  });
  return { ...obj, nodes };
}

export function getPreprocessSidecar(diagram: WireDiagram): PreprocessSidecar | undefined {
  return (diagram as unknown as { [SIDECAR_KEY]?: PreprocessSidecar })[SIDECAR_KEY];
}

/**
 * Loose input form: missing edges, missing version, etc. Use parseWireDiagram
 * to apply defaults and discriminator-based validation.
 */
export function parseWireDiagram(input: unknown): WireDiagram {
  const sidecar: PreprocessSidecar = { forbiddenFields: [] };
  const parsed = WireDiagramSchema.parse(preprocessDiagram(input, sidecar));
  attachSidecar(parsed, sidecar);
  return parsed;
}

export function safeParseWireDiagram(input: unknown):
  | { success: true; data: WireDiagram }
  | { success: false; error: z.ZodError } {
  const sidecar: PreprocessSidecar = { forbiddenFields: [] };
  const result = WireDiagramSchema.safeParse(preprocessDiagram(input, sidecar));
  if (result.success) {
    attachSidecar(result.data, sidecar);
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

function attachSidecar(diagram: WireDiagram, sidecar: PreprocessSidecar): void {
  Object.defineProperty(diagram, SIDECAR_KEY, {
    value: sidecar,
    enumerable: false,
    writable: false,
    configurable: true
  });
}

/**
 * Split a `from` ref like "classify.success" into [nodeId, branch?].
 */
export function splitFromRef(ref: string): { nodeId: string; branch?: string } {
  const idx = ref.indexOf(".");
  if (idx === -1) {
    return { nodeId: ref };
  }
  return { nodeId: ref.slice(0, idx), branch: ref.slice(idx + 1) };
}
