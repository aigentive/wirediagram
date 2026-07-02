import {
  EdgeSchema,
  WireDiagramSchema,
  type LayoutDirection,
  type LayoutEngine,
  type WireDiagram,
  type WireEdge,
  type WireNode
} from "./schema.js";
import {
  addNode,
  addNote,
  connect,
  disconnect,
  emptyDiagram,
  removeNode,
  setLayout,
  updateNode,
  type AddNodeInput,
  type ConnectInput,
  type DisconnectInput
} from "./edit.js";
import { validate, type ValidationResult } from "./validate.js";

export type WireNodeInput = AddNodeInput;
export type WireNodePatch = Record<string, unknown>;
export type WireEdgeInput = ConnectInput;
export type WireEdgePatch = Record<string, unknown>;
export type WireMetadataPatch = Record<string, unknown>;

export type WireAction =
  | { type: "diagram.create"; id?: string; title?: string; layout?: LayoutDirection }
  | { type: "diagram.replace"; diagram: WireDiagram }
  | { type: "diagram.patch"; patch: Record<string, unknown> }
  | { type: "batch"; actions: WireAction[] }
  | { type: "node.add"; node: WireNodeInput; select?: boolean }
  | { type: "node.patch"; id: string; patch: WireNodePatch }
  | { type: "node.remove"; id: string }
  | { type: "node.move"; id: string; position: { x: number; y: number } }
  | { type: "node.resize"; id: string; size: { width: number; height: number } }
  | { type: "edge.connect"; edge: WireEdgeInput }
  | { type: "edge.patch"; id: string; patch: WireEdgePatch }
  | { type: "edge.disconnect"; from: string; to: string; branch?: string }
  | { type: "edge.remove"; id: string }
  | { type: "layout.apply"; direction?: LayoutDirection; engine?: LayoutEngine }
  | { type: "group.add"; group: WireNodeInput; children?: string[] }
  | { type: "group.ungroup"; id: string }
  | { type: "note.add"; note: { title: string; body?: string; attachedTo?: string; id?: string; tone?: WireNode["tone"] } }
  | { type: "metadata.patch"; patch: WireMetadataPatch };

export interface ApplyWireActionOptions {
  validate?: boolean;
  inverse?: boolean;
}

export interface ApplyWireActionResult {
  diagram: WireDiagram;
  validation: ValidationResult;
  inverse?: WireAction;
  changedNodeIds: string[];
  changedEdgeIds: string[];
}

interface InternalApplyResult {
  diagram: WireDiagram;
  inverse?: WireAction;
}

export function applyWireAction(
  diagram: WireDiagram,
  action: WireAction,
  options: ApplyWireActionOptions = {}
): ApplyWireActionResult {
  const shouldValidate = options.validate ?? true;
  const shouldBuildInverse = options.inverse ?? true;
  const applied = applyWireActionInternal(diagram, action, shouldBuildInverse);
  return {
    diagram: applied.diagram,
    validation: shouldValidate ? validate(applied.diagram) : { valid: true, issues: [] },
    inverse: applied.inverse,
    changedNodeIds: changedNodeIds(diagram, applied.diagram),
    changedEdgeIds: changedEdgeIds(diagram, applied.diagram)
  };
}

export function applyWireActions(
  diagram: WireDiagram,
  actions: WireAction[],
  options: ApplyWireActionOptions = {}
): ApplyWireActionResult {
  const shouldValidate = options.validate ?? true;
  const shouldBuildInverse = options.inverse ?? true;
  const applied = applyWireActionInternal(diagram, { type: "batch", actions }, shouldBuildInverse);
  return {
    diagram: applied.diagram,
    validation: shouldValidate ? validate(applied.diagram) : { valid: true, issues: [] },
    inverse: applied.inverse,
    changedNodeIds: changedNodeIds(diagram, applied.diagram),
    changedEdgeIds: changedEdgeIds(diagram, applied.diagram)
  };
}

function applyWireActionInternal(
  diagram: WireDiagram,
  action: WireAction,
  buildInverse: boolean
): InternalApplyResult {
  switch (action.type) {
    case "diagram.create": {
      const next = emptyDiagram({ id: action.id, title: action.title, layout: action.layout });
      return {
        diagram: next,
        inverse: buildInverse ? { type: "diagram.replace", diagram } : undefined
      };
    }

    case "diagram.replace": {
      const next = WireDiagramSchema.parse(action.diagram);
      return {
        diagram: next,
        inverse: buildInverse ? { type: "diagram.replace", diagram } : undefined
      };
    }

    case "diagram.patch": {
      const inverse = buildInverse
        ? ({ type: "diagram.patch", patch: inversePatch(diagram as unknown as Record<string, unknown>, action.patch) } satisfies WireAction)
        : undefined;
      const next = WireDiagramSchema.parse(applyNullablePatch(diagram as unknown as Record<string, unknown>, action.patch));
      return { diagram: next, inverse };
    }

    case "batch": {
      let current = diagram;
      const inverses: WireAction[] = [];
      for (const child of action.actions) {
        const applied = applyWireActionInternal(current, child, buildInverse);
        current = applied.diagram;
        if (buildInverse && applied.inverse) {
          inverses.unshift(applied.inverse);
        }
      }
      return {
        diagram: current,
        inverse: buildInverse && inverses.length > 0 ? { type: "batch", actions: inverses } : undefined
      };
    }

    case "node.add": {
      const { diagram: next, node } = addNode(diagram, action.node);
      return {
        diagram: next,
        inverse: buildInverse ? { type: "node.remove", id: node.id } : undefined
      };
    }

    case "node.patch": {
      const current = findNode(diagram, action.id);
      const { diagram: next } = updateNode(diagram, action.id, action.patch);
      return {
        diagram: next,
        inverse: buildInverse ? { type: "node.patch", id: action.id, patch: inversePatch(current, action.patch) } : undefined
      };
    }

    case "node.remove": {
      const { diagram: next } = removeNode(diagram, action.id);
      return {
        diagram: next,
        inverse: buildInverse ? { type: "diagram.replace", diagram } : undefined
      };
    }

    case "node.move": {
      const current = findNode(diagram, action.id);
      const { diagram: next } = updateNode(diagram, action.id, { position: action.position });
      return {
        diagram: next,
        inverse: buildInverse
          ? { type: "node.patch", id: action.id, patch: { position: current.position ?? null } }
          : undefined
      };
    }

    case "node.resize": {
      const current = findNode(diagram, action.id);
      const { diagram: next } = updateNode(diagram, action.id, { size: action.size });
      return {
        diagram: next,
        inverse: buildInverse
          ? { type: "node.patch", id: action.id, patch: { size: current.size ?? null } }
          : undefined
      };
    }

    case "edge.connect": {
      const next = connect(diagram, action.edge);
      const added = next.edges.find((edge) => !diagram.edges.some((before) => edgeKey(before) === edgeKey(edge)));
      return {
        diagram: next,
        inverse: buildInverse && added?.id ? { type: "edge.remove", id: added.id } : inverseDisconnect(action.edge)
      };
    }

    case "edge.patch": {
      const current = findEdge(diagram, action.id);
      const next = updateEdge(diagram, action.id, action.patch);
      return {
        diagram: next,
        inverse: buildInverse ? { type: "edge.patch", id: action.id, patch: inversePatch(current, action.patch) } : undefined
      };
    }

    case "edge.disconnect": {
      const next = disconnect(diagram, action);
      return {
        diagram: next,
        inverse: buildInverse ? { type: "diagram.replace", diagram } : undefined
      };
    }

    case "edge.remove": {
      const current = findEdge(diagram, action.id);
      const next = removeEdge(diagram, action.id);
      return {
        diagram: next,
        inverse: buildInverse ? { type: "edge.connect", edge: wireEdgeToInput(current) } : undefined
      };
    }

    case "layout.apply": {
      const inverse = buildInverse
        ? ({ type: "layout.apply", direction: diagram.layout, engine: diagram.layoutEngine } satisfies WireAction)
        : undefined;
      return {
        diagram: setLayout(diagram, action.direction ?? diagram.layout, action.engine),
        inverse
      };
    }

    case "group.add": {
      const { diagram: withGroup, node } = addNode(diagram, { ...action.group, kind: "group" });
      let next = withGroup;
      if (action.children?.length) {
        next = updateNode(next, node.id, { children: action.children }).diagram;
        for (const childId of action.children) {
          next = updateNode(next, childId, { parent: node.id }).diagram;
        }
      }
      return {
        diagram: next,
        inverse: buildInverse ? { type: "node.remove", id: node.id } : undefined
      };
    }

    case "group.ungroup": {
      const group = findNode(diagram, action.id);
      if (group.kind !== "group") {
        throw new Error(`Node "${action.id}" is kind "${group.kind}", not "group".`);
      }
      let next = updateNode(diagram, action.id, { children: null }).diagram;
      for (const child of diagram.nodes.filter((node) => node.parent === action.id)) {
        next = updateNode(next, child.id, { parent: null }).diagram;
      }
      return {
        diagram: next,
        inverse: buildInverse ? { type: "diagram.replace", diagram } : undefined
      };
    }

    case "note.add": {
      const { diagram: next, node } = addNote(diagram, action.note);
      return {
        diagram: next,
        inverse: buildInverse ? { type: "node.remove", id: node.id } : undefined
      };
    }

    case "metadata.patch": {
      const current = diagram.metadata ?? {};
      const nextMetadata = applyNullablePatch(current, action.patch);
      const next = WireDiagramSchema.parse({
        ...diagram,
        metadata: Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined
      });
      return {
        diagram: next,
        inverse: buildInverse ? { type: "metadata.patch", patch: inversePatch(current, action.patch) } : undefined
      };
    }
  }
}

function updateEdge(diagram: WireDiagram, id: string, patch: WireEdgePatch): WireDiagram {
  const idx = diagram.edges.findIndex((edge) => edge.id === id);
  if (idx === -1) {
    throw new Error(`Edge "${id}" not found.`);
  }
  const current = diagram.edges[idx]!;
  const merged = applyNullablePatch(current as unknown as Record<string, unknown>, patch);
  merged.id = current.id;
  const edge = EdgeSchema.parse(merged);
  const edges = [...diagram.edges];
  edges[idx] = edge;
  return { ...diagram, edges };
}

function removeEdge(diagram: WireDiagram, id: string): WireDiagram {
  if (!diagram.edges.some((edge) => edge.id === id)) {
    throw new Error(`Edge "${id}" not found.`);
  }
  return { ...diagram, edges: diagram.edges.filter((edge) => edge.id !== id) };
}

function findNode(diagram: WireDiagram, id: string): WireNode {
  const node = diagram.nodes.find((candidate) => candidate.id === id);
  if (!node) {
    throw new Error(`Node "${id}" not found.`);
  }
  return node;
}

function findEdge(diagram: WireDiagram, id: string): WireEdge {
  const edge = diagram.edges.find((candidate) => candidate.id === id);
  if (!edge) {
    throw new Error(`Edge "${id}" not found.`);
  }
  return edge;
}

function applyNullablePatch(
  current: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return stripUndefined(next);
}

function inversePatch(
  current: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const inverse: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    inverse[key] = Object.prototype.hasOwnProperty.call(current, key) ? current[key] : null;
  }
  return inverse;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

function wireEdgeToInput(edge: WireEdge): WireEdgeInput {
  return stripUndefined({ ...edge }) as WireEdgeInput;
}

function inverseDisconnect(edge: WireEdgeInput): WireAction | undefined {
  return { type: "edge.disconnect", from: edge.from, to: edge.to, branch: edge.branch };
}

function changedNodeIds(before: WireDiagram, after: WireDiagram): string[] {
  return changedIds(before.nodes, after.nodes);
}

function changedEdgeIds(before: WireDiagram, after: WireDiagram): string[] {
  return changedIds(
    before.edges.map((edge) => ({ ...edge, id: edge.id ?? edgeKey(edge) })),
    after.edges.map((edge) => ({ ...edge, id: edge.id ?? edgeKey(edge) }))
  );
}

function changedIds<T extends { id?: string }>(before: T[], after: T[]): string[] {
  const beforeById = new Map(before.map((item) => [item.id, item]));
  const afterById = new Map(after.map((item) => [item.id, item]));
  const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])].filter(
    (id): id is string => typeof id === "string"
  );
  return ids.filter((id) => JSON.stringify(beforeById.get(id)) !== JSON.stringify(afterById.get(id)));
}

function edgeKey(edge: WireEdge): string {
  return `${edge.id ?? ""}|${edge.from}|${edge.to}|${edge.branch ?? ""}|${edge.label ?? ""}`;
}
