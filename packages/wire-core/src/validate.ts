import {
  type WireDiagram,
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
        message: `Node "${nodeId}" used "${field}" — Wire uses 'from' for connections (LLM-friendly directionality). Field was dropped.`,
        nodeId,
        hint: `Replace with from: "<sourceId>" on this node.`
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

  // 6. orphan warning — nodes with no incoming or outgoing edges (excluding triggers, ends, notes).
  const inEdges = new Map<string, number>();
  const outEdges = new Map<string, number>();
  for (const edge of resolvedEdges) {
    outEdges.set(edge.from, (outEdges.get(edge.from) ?? 0) + 1);
    inEdges.set(edge.to, (inEdges.get(edge.to) ?? 0) + 1);
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
