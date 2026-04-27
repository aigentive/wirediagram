import type { CSSProperties, ReactElement } from "react";
import { useWireActions, useWireDiagram, useWireSelection } from "../hooks.js";

export interface WireInspectorProps {
  className?: string;
  style?: CSSProperties;
}

export function WireInspector({ className, style }: WireInspectorProps): ReactElement {
  const diagram = useWireDiagram();
  const actions = useWireActions();
  const [selection] = useWireSelection();
  const node = selection.nodeIds.length === 1
    ? diagram.nodes.find((candidate) => candidate.id === selection.nodeIds[0])
    : undefined;

  if (!node) {
    return (
      <aside className={className} style={{ fontSize: 13, color: "#64748b", ...style }}>
        No node selected
      </aside>
    );
  }

  return (
    <aside className={className} style={{ display: "grid", gap: 8, fontSize: 13, ...style }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span>Title</span>
        <input
          value={node.title}
          onChange={(event) => actions.dispatch({ type: "node.patch", id: node.id, patch: { title: event.target.value } })}
        />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span>Description</span>
        <textarea
          value={node.description ?? ""}
          onChange={(event) =>
            actions.dispatch({
              type: "node.patch",
              id: node.id,
              patch: { description: event.target.value || null }
            })
          }
        />
      </label>
    </aside>
  );
}
