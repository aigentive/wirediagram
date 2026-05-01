import {
  type WireDiagram,
  type WireNode,
  getPreprocessSidecar,
  safeParseWireDiagram,
  splitFromRef
} from "./schema.js";
import { normalize } from "./normalize.js";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  /** Stable code consumers can match on. */
  code: string;
  message: string;
  /** Best-effort node id this issue is about. */
  nodeId?: string;
  /** Best-effort edge id this issue is about. */
  edgeId?: string;
  /** Suggested fix in plain language. Used by MCP repair flows. */
  hint?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const ERROR = "error" as const;
const WARNING = "warning" as const;

/**
 * Validate a Wire diagram. Returns a flat list of issues — `error`s make
 * the diagram invalid, `warning`s do not. Designed to render into agent-
 * readable repair prompts.
 */
export function validate(input: WireDiagram | unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  // If the caller passes an already-parsed diagram, the original preprocess
  // sidecar (with forbidden-field warnings, etc.) is attached as a non-
  // enumerable symbol property. We must reuse it — re-parsing on input
  // that has already been cleaned would lose those warnings.
  const existingSidecar =
    input && typeof input === "object"
      ? getPreprocessSidecar(input as WireDiagram)
      : undefined;

  const parsed = safeParseWireDiagram(input);
  if (!parsed.success) {
    for (const zIssue of parsed.error.issues) {
      issues.push({
        severity: ERROR,
        code: `schema.${zIssue.code}`,
        message: `${zIssue.path.join(".") || "<root>"}: ${zIssue.message}`,
        hint: "Fix the field above. Run validate() again."
      });
    }
    return { valid: false, issues };
  }

  const diagram: WireDiagram = parsed.data;
  const { nodeIndex, resolvedEdges } = normalize(diagram);

  // 0. Forbidden top-level fields stripped during preprocess (e.g. `connectsTo`).
  const sidecar = existingSidecar ?? getPreprocessSidecar(diagram);
  if (sidecar) {
    for (const { nodeId, field } of sidecar.forbiddenFields) {
      issues.push({
        severity: WARNING,
        code: "node.forbidden-field",
        message: `Node "${nodeId}" used "${field}" — Wire nodes use 'from' on the target node for connections. Field was dropped.`,
        nodeId,
        hint: `To connect source -> this node, set from: "<sourceId>" on this node. For visual card content, use title, description, and data.card. For card visual style, use tone and style.`
      });
    }
  }

  // 1. Duplicate node ids.
  const seenIds = new Set<string>();
  for (const node of diagram.nodes) {
    if (seenIds.has(node.id)) {
      issues.push({
        severity: ERROR,
        code: "node.duplicate-id",
        message: `Duplicate node id "${node.id}".`,
        nodeId: node.id,
        hint: "Each node must have a unique id within the diagram."
      });
    }
    seenIds.add(node.id);
  }

  // 2. attachedTo must reference an existing node.
  for (const node of diagram.nodes) {
    if (node.attachedTo && !nodeIndex.has(node.attachedTo)) {
      issues.push({
        severity: ERROR,
        code: "node.attached-to-missing",
        message: `Node "${node.id}" is attachedTo "${node.attachedTo}" which does not exist.`,
        nodeId: node.id,
        hint: `Either add a node with id "${node.attachedTo}" or remove attachedTo.`
      });
    }
  }

  // 3. parent must reference a group.
  for (const node of diagram.nodes) {
    if (!node.parent) continue;
    const parent = nodeIndex.get(node.parent);
    if (!parent) {
      issues.push({
        severity: ERROR,
        code: "node.parent-missing",
        message: `Node "${node.id}" references parent "${node.parent}" which does not exist.`,
        nodeId: node.id,
        hint: "Create the group or remove the parent reference."
      });
    } else if (parent.kind !== "group") {
      issues.push({
        severity: ERROR,
        code: "node.parent-not-group",
        message: `Node "${node.id}" parent "${node.parent}" is kind "${parent.kind}", not "group".`,
        nodeId: node.id,
        hint: "Only group nodes can be parents."
      });
    }
  }

  // 4. condition node must declare branches and any from="<id>.<branch>" must match.
  for (const node of diagram.nodes) {
    if (node.kind === "condition") {
      if (!node.branches || node.branches.length === 0) {
        issues.push({
          severity: ERROR,
          code: "condition.no-branches",
          message: `Condition node "${node.id}" must declare at least one branch.`,
          nodeId: node.id,
          hint: 'Add a `branches` array, e.g. ["yes", "no"].'
        });
      }
      const dupes = node.branches?.filter((b, i) => node.branches!.indexOf(b) !== i);
      if (dupes && dupes.length) {
        issues.push({
          severity: ERROR,
          code: "condition.duplicate-branch",
          message: `Condition node "${node.id}" has duplicate branches: ${[...new Set(dupes)].join(", ")}.`,
          nodeId: node.id,
          hint: "Branch names must be unique within a single condition."
        });
      }
    }
  }

  // 5. resolve every edge target/source. Branches must reference a real condition branch.
  for (const edge of resolvedEdges) {
    if (!nodeIndex.has(edge.from)) {
      issues.push({
        severity: ERROR,
        code: "edge.from-missing",
        message: `Edge "${edge.id}" references missing source "${edge.from}".`,
        edgeId: edge.id,
        hint: `Add a node with id "${edge.from}" or update the source.`
      });
    }
    if (!nodeIndex.has(edge.to)) {
      issues.push({
        severity: ERROR,
        code: "edge.to-missing",
        message: `Edge "${edge.id}" references missing target "${edge.to}".`,
        edgeId: edge.id,
        hint: `Add a node with id "${edge.to}" or update the target.`
      });
    }
    if (edge.fromBranch) {
      const source = nodeIndex.get(edge.from);
      if (source && source.kind !== "condition") {
        issues.push({
          severity: ERROR,
          code: "edge.branch-from-non-condition",
          message: `Edge "${edge.id}" uses branch "${edge.fromBranch}" on non-condition "${edge.from}".`,
          edgeId: edge.id,
          hint: `Branches are only valid from condition nodes. Drop the ".${edge.fromBranch}" suffix or change the source.`
        });
      } else if (source && source.kind === "condition" && !source.branches.includes(edge.fromBranch)) {
        issues.push({
          severity: ERROR,
          code: "edge.unknown-branch",
          message: `Condition "${edge.from}" has no branch "${edge.fromBranch}". Known: ${source.branches.join(", ")}.`,
          edgeId: edge.id,
          hint: `Add "${edge.fromBranch}" to the condition's branches or use a known branch name.`
        });
      }
    }
  }

  // 5b. duplicate connection — more than one edge between the same source/target
  //     (with the same branch). Branched edges from a condition to the same target
  //     stay distinct as long as they use different branches.
  const edgeKeyCounts = new Map<string, { count: number; from: string; to: string; branch?: string; edgeIds: string[] }>();
  for (const edge of resolvedEdges) {
    const key = `${edge.from}::${edge.fromBranch ?? ""}::${edge.to}`;
    const entry = edgeKeyCounts.get(key);
    if (entry) {
      entry.count += 1;
      entry.edgeIds.push(edge.id);
    } else {
      edgeKeyCounts.set(key, { count: 1, from: edge.from, to: edge.to, branch: edge.fromBranch, edgeIds: [edge.id] });
    }
  }
  for (const entry of edgeKeyCounts.values()) {
    if (entry.count <= 1) continue;
    const sourceLabel = entry.branch ? `${entry.from}.${entry.branch}` : entry.from;
    issues.push({
      severity: ERROR,
      code: "edge.duplicate-connection",
      message: `Duplicate connection from "${sourceLabel}" to "${entry.to}" (${entry.count} times).`,
      edgeId: entry.edgeIds[entry.edgeIds.length - 1],
      hint: 'Only one edge is allowed between the same source and target. Remove the duplicate `from` ref or the explicit edge.'
    });
  }

  // 6. orphan warning — nodes with no incoming or outgoing edges (excluding triggers, ends, notes).
  const inEdges = new Map<string, number>();
  const outEdges = new Map<string, number>();
  const outgoingBranches = new Map<string, Set<string>>();
  const adjacency = new Map<string, Set<string>>();
  for (const node of diagram.nodes) adjacency.set(node.id, new Set());
  for (const edge of resolvedEdges) {
    outEdges.set(edge.from, (outEdges.get(edge.from) ?? 0) + 1);
    inEdges.set(edge.to, (inEdges.get(edge.to) ?? 0) + 1);
    if (edge.fromBranch) {
      const branches = outgoingBranches.get(edge.from) ?? new Set<string>();
      branches.add(edge.fromBranch);
      outgoingBranches.set(edge.from, branches);
    }
    if (nodeIndex.has(edge.from) && nodeIndex.has(edge.to)) {
      adjacency.get(edge.from)?.add(edge.to);
    }
  }

  const triggers = diagram.nodes.filter((node) => node.kind === "trigger");
  if (diagram.nodes.some((node) => node.kind !== "note" && node.kind !== "group") && triggers.length === 0) {
    issues.push({
      severity: WARNING,
      code: "flow.no-trigger",
      message: "Diagram has workflow nodes but no trigger node.",
      hint: 'Add a trigger node for the entry point, or confirm the diagram intentionally starts elsewhere.'
    });
  }

  for (const trigger of triggers) {
    if ((outEdges.get(trigger.id) ?? 0) === 0) {
      issues.push({
        severity: WARNING,
        code: "trigger.no-outgoing",
        message: `Trigger node "${trigger.id}" has no outgoing connection.`,
        nodeId: trigger.id,
        hint: `Connect the first workflow step with from: "${trigger.id}".`
      });
    }
  }

  for (const node of diagram.nodes) {
    if (node.kind === "end" && (inEdges.get(node.id) ?? 0) === 0) {
      issues.push({
        severity: WARNING,
        code: "end.no-incoming",
        message: `End node "${node.id}" has no incoming connection.`,
        nodeId: node.id,
        hint: "Connect a preceding workflow step to this end node."
      });
    }
  }

  for (const node of diagram.nodes) {
    if (node.kind !== "condition") continue;
    const used = outgoingBranches.get(node.id) ?? new Set<string>();
    for (const branch of node.branches) {
      if (used.has(branch)) continue;
      issues.push({
        severity: WARNING,
        code: "condition.unused-branch",
        message: `Condition "${node.id}" declares branch "${branch}" but no target uses from="${node.id}.${branch}".`,
        nodeId: node.id,
        hint: `Add a downstream node with from: "${node.id}.${branch}" or remove the unused branch.`
      });
    }
  }

  if (triggers.length > 0) {
    const reachable = new Set<string>();
    const stack = triggers.map((node) => node.id);
    while (stack.length) {
      const id = stack.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const next of adjacency.get(id) ?? []) stack.push(next);
    }
    for (const node of diagram.nodes) {
      if (node.kind === "trigger" || node.kind === "note" || node.kind === "group") continue;
      if (reachable.has(node.id)) continue;
      issues.push({
        severity: WARNING,
        code: "flow.unreachable",
        message: `Node "${node.id}" is not reachable from any trigger.`,
        nodeId: node.id,
        hint: 'Wire it into the flow with `from` on this node, or add a trigger for this branch.'
      });
    }
  }

  for (const node of diagram.nodes) {
    if (
      node.kind === "trigger" ||
      node.kind === "end" ||
      node.kind === "note" ||
      node.kind === "group"
    ) {
      continue;
    }
    const hasIn = (inEdges.get(node.id) ?? 0) > 0;
    const hasOut = (outEdges.get(node.id) ?? 0) > 0;
    if (!hasIn && !hasOut) {
      issues.push({
        severity: WARNING,
        code: "node.orphan",
        message: `Node "${node.id}" has no incoming or outgoing connections.`,
        nodeId: node.id,
        hint: 'Connect it via `from: "<sourceId>"` on this node or another.'
      });
    }
  }

  for (const node of diagram.nodes) {
    const cardIssue = invalidCardContentMessage(node);
    if (!cardIssue) continue;
    issues.push({
      severity: WARNING,
      code: "node.card-invalid",
      message: `Node "${node.id}" has invalid data.card content: ${cardIssue}`,
      nodeId: node.id,
      hint: "Keep data.card serializable and limited to title, description, badges, meta, progress, and footer."
    });
  }

  // 6b. duplicate `from` refs on the same node.
  for (const node of diagram.nodes) {
    const refs = Array.isArray(node.from) ? node.from : node.from ? [node.from] : [];
    const seenRefs = new Set<string>();
    for (const ref of refs) {
      if (seenRefs.has(ref)) {
        issues.push({
          severity: WARNING,
          code: "node.duplicate-from",
          message: `Node "${node.id}" lists "${ref}" in from more than once.`,
          nodeId: node.id,
          hint: "Drop the duplicate — Wire treats repeated refs as one edge."
        });
      }
      seenRefs.add(ref);
    }
  }

  // 7. self-loop warning — `from` referencing the same node id.
  for (const node of diagram.nodes) {
    const refs = Array.isArray(node.from) ? node.from : node.from ? [node.from] : [];
    for (const ref of refs) {
      const { nodeId } = splitFromRef(ref);
      if (nodeId === node.id) {
        issues.push({
          severity: WARNING,
          code: "edge.self-loop",
          message: `Node "${node.id}" references itself via from="${ref}".`,
          nodeId: node.id,
          hint: "Self-loops are unusual. Confirm the intent or fix the reference."
        });
      }
    }
  }

  // 8. cycle detection — emit one warning per detected cycle.
  const cycles = findCycles(resolvedEdges, nodeIndex);
  for (const cycle of cycles) {
    issues.push({
      severity: WARNING,
      code: "flow.cycle",
      message: `Cycle detected: ${cycle.join(" → ")} → ${cycle[0]}.`,
      hint: "Wire diagrams should usually be DAGs. Add a guard or break the loop."
    });
  }

  // 8b. layout engine reservation — elk is in the schema for forward
  // compatibility but layout still routes through dagre.
  if (diagram.layoutEngine === "elk") {
    issues.push({
      severity: WARNING,
      code: "flow.layout-engine-not-implemented",
      message: 'layoutEngine: "elk" is reserved but not implemented; falling back to dagre.',
      hint: "Drop layoutEngine, or pin it to 'dagre' explicitly until elk is wired."
    });
  }

  // 9. group reciprocity — if group.children lists an id, that node should
  //    declare parent=group (and vice versa for warning purposes).
  for (const group of diagram.nodes) {
    if (group.kind !== "group" || !Array.isArray(group.children)) continue;
    for (const childId of group.children) {
      const child = nodeIndex.get(childId);
      if (!child) {
        issues.push({
          severity: ERROR,
          code: "group.child-missing",
          message: `Group "${group.id}" lists child "${childId}" which does not exist.`,
          nodeId: group.id,
          hint: `Add the node or drop "${childId}" from group.children.`
        });
        continue;
      }
      if (child.parent !== group.id) {
        issues.push({
          severity: WARNING,
          code: "group.child-parent-mismatch",
          message: `Group "${group.id}" lists child "${childId}" but that node's parent is "${child.parent ?? "<none>"}".`,
          nodeId: childId,
          hint: `Set parent: "${group.id}" on "${childId}" or remove it from group.children.`
        });
      }
    }
  }

  const valid = !issues.some((i) => i.severity === ERROR);
  return { valid, issues };
}

function invalidCardContentMessage(node: WireNode): string | undefined {
  const card = node.data?.card;
  if (card === undefined) return undefined;
  if (!isRecord(card)) return "data.card must be an object.";

  const allowed = new Set(["title", "description", "badges", "meta", "progress", "footer"]);
  const unknown = Object.keys(card).filter((key) => !allowed.has(key));
  if (unknown.length > 0) return `unsupported fields: ${unknown.join(", ")}.`;

  if (card.title !== undefined && typeof card.title !== "string") return "title must be a string.";
  if (card.description !== undefined && typeof card.description !== "string") return "description must be a string.";
  if (card.footer !== undefined && typeof card.footer !== "string") return "footer must be a string.";

  if (card.badges !== undefined) {
    if (!Array.isArray(card.badges)) return "badges must be an array.";
    if (!card.badges.every(isCardBadge)) return "badges must contain strings or { label, tone? } objects.";
  }

  if (card.meta !== undefined) {
    if (!Array.isArray(card.meta)) return "meta must be an array.";
    if (!card.meta.every(isCardMetaItem)) return "meta must contain strings, numbers, booleans, or { label?, value } objects.";
  }

  if (card.progress !== undefined && typeof card.progress !== "number" && !isCardProgress(card.progress)) {
    return "progress must be a number or { value, max?, label?, steps?, showPercent? } object.";
  }

  return undefined;
}

function isCardBadge(value: unknown): boolean {
  return typeof value === "string" ||
    (isRecord(value) &&
      typeof value.label === "string" &&
      (value.tone === undefined ||
        value.tone === "default" ||
        value.tone === "info" ||
        value.tone === "success" ||
        value.tone === "warning" ||
        value.tone === "error"));
}

function isCardMetaItem(value: unknown): boolean {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (isRecord(value) &&
      (value.label === undefined || typeof value.label === "string") &&
      (typeof value.value === "string" || typeof value.value === "number" || typeof value.value === "boolean"));
}

function isCardProgress(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.value === "number" &&
    (value.max === undefined || typeof value.max === "number") &&
    (value.label === undefined || typeof value.label === "string") &&
    (value.steps === undefined || typeof value.steps === "number") &&
    (value.showPercent === undefined || typeof value.showPercent === "boolean");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Tarjan-lite cycle detection. Returns each strongly-connected component of
 * size >= 2, plus self-loops. Result is one node-id list per cycle in
 * traversal order.
 */
function findCycles(
  edges: Array<{ from: string; to: string }>,
  nodeIndex: Map<string, unknown>
): string[][] {
  const adj = new Map<string, string[]>();
  for (const id of nodeIndex.keys()) adj.set(id, []);
  for (const e of edges) {
    if (!adj.has(e.from) || !adj.has(e.to)) continue;
    if (e.from === e.to) continue; // self-loops surfaced separately
    adj.get(e.from)!.push(e.to);
  }

  const cycles: string[][] = [];
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const id of adj.keys()) color.set(id, WHITE);

  function dfs(start: string, stack: string[], visited: Set<string>) {
    color.set(start, GRAY);
    stack.push(start);
    for (const next of adj.get(start) ?? []) {
      if (color.get(next) === GRAY) {
        const idx = stack.indexOf(next);
        if (idx >= 0) cycles.push(stack.slice(idx));
      } else if (color.get(next) === WHITE && !visited.has(next)) {
        dfs(next, stack, visited);
      }
    }
    stack.pop();
    color.set(start, BLACK);
    visited.add(start);
  }

  const visited = new Set<string>();
  for (const id of adj.keys()) {
    if (color.get(id) === WHITE) {
      dfs(id, [], visited);
    }
  }
  return cycles;
}
