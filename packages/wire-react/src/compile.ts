import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import {
  parseWireDiagram,
  generateNodeId,
  slugify,
  type WireDiagram,
  type WireNode,
  type LayoutDirection
} from "@aigentive/wire-core";

interface FlowProps {
  layout?: LayoutDirection;
  id?: string;
  title?: string;
  children?: ReactNode;
}

interface NodeMarker {
  __wireKind: WireNode["kind"];
  displayName?: string;
}

function isNodeMarker(el: ReactElement): el is ReactElement & { type: NodeMarker } {
  const t = el.type as unknown as Partial<NodeMarker> | undefined | null;
  if (!t) return false;
  if (typeof t !== "object" && typeof t !== "function") return false;
  return "__wireKind" in t;
}

function flattenChildren(children: ReactNode): ReactElement[] {
  const out: ReactElement[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    out.push(child);
    const subChildren = (child.props as { children?: ReactNode }).children;
    if (subChildren) {
      // Don't recurse INTO the marker — its `children` is the host's body
      // (e.g. note body, group children).
      // But we DO recurse into Group's children to find nested nodes.
      const t = child.type as unknown as NodeMarker | undefined;
      if (t && t.__wireKind === "group") {
        out.push(...flattenChildren(subChildren));
      }
    }
  });
  return out;
}

function reactNodeToText(node: ReactNode): string | undefined {
  if (node == null || node === false) return undefined;
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).filter(Boolean).join("");
  if (isValidElement(node)) {
    return reactNodeToText((node.props as { children?: ReactNode }).children);
  }
  return undefined;
}

function elementToWireNode(
  el: ReactElement,
  takenIds: Set<string>,
  parentGroupId?: string
): WireNode | undefined {
  if (!isNodeMarker(el)) return undefined;
  const kind = (el.type as NodeMarker).__wireKind;
  const props = el.props as Record<string, unknown>;
  const id = generateNodeId({
    title: typeof props.title === "string" ? props.title : undefined,
    kind,
    taken: takenIds,
    preferredId: typeof props.id === "string" ? props.id : undefined
  });
  takenIds.add(id);

  // Title must be non-empty; fall back to slugify(id) (always a string,
  // possibly empty) and finally `id` itself.
  const titleProp = typeof props.title === "string" && props.title.length > 0 ? props.title : undefined;
  const slugTitle = slugify(id);
  const next: Record<string, unknown> = {
    id,
    kind,
    title: titleProp ?? (slugTitle.length > 0 ? slugTitle : id)
  };
  for (const key of [
    "description",
    "tone",
    "from",
    "after",
    "attachedTo",
    "parent",
    "data",
    "position",
    "size",
    "model",
    "prompt",
    "tools",
    "ref",
    "branches",
    "body",
    "children"
  ] as const) {
    if (key === "children") {
      // For notes, fold children → body.
      if (kind === "note" && next.body === undefined) {
        const text = reactNodeToText(props.children as ReactNode);
        if (text !== undefined) next.body = text;
      }
      continue;
    }
    if (props[key] !== undefined) next[key] = props[key];
  }
  if (parentGroupId && next.parent === undefined) {
    next.parent = parentGroupId;
  }
  return next as WireNode;
}

interface CompileResult {
  diagram: WireDiagram;
}

/**
 * Walk a JSX `<Flow>` tree and produce a canonical Wire diagram. Throws
 * (via parseWireDiagram) if the tree produces an invalid graph — rely on
 * `validate()` afterward for repair-friendly error reporting.
 */
export function compile(flowElement: ReactElement<FlowProps>): WireDiagram {
  const flowProps = flowElement.props;
  const taken = new Set<string>();
  const nodes: WireNode[] = [];

  function walk(children: ReactNode, parentGroupId?: string): void {
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const t = child.type as unknown as NodeMarker | undefined;
      if (!t || !t.__wireKind) return;
      const wn = elementToWireNode(child, taken, parentGroupId);
      if (wn) nodes.push(wn);
      if (t.__wireKind === "group") {
        const childChildren = (child.props as { children?: ReactNode }).children;
        if (childChildren) walk(childChildren, wn?.id);
      }
    });
  }

  walk(flowProps.children);

  // Best-effort: if a Group declares its children via JSX nesting, also
  // populate group.children so validate's reciprocity check passes.
  for (const n of nodes) {
    if (n.kind !== "group") continue;
    const children = nodes.filter((c) => c.parent === n.id).map((c) => c.id);
    if (children.length) {
      (n as { children?: string[] }).children = children;
    }
  }

  return parseWireDiagram({
    id: flowProps.id,
    title: flowProps.title,
    layout: flowProps.layout ?? "LR",
    nodes,
    edges: []
  });
}

export type { FlowProps };
export { flattenChildren };
