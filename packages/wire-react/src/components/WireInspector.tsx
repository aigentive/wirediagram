import type { CSSProperties, ReactElement } from "react";
import { useWireActions, useWireDiagram, useWireSelection } from "../hooks.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { StatusPill } from "../primitives/StatusPill.js";
import { cx } from "./classes.js";

export interface WireInspectorProps {
  className?: string;
  style?: CSSProperties;
}

const FIELD_LABEL = "text-[11.5px] font-medium text-wire-secondary mb-[3px]";
const TEXT_INPUT =
  "w-full rounded-md border border-wire bg-wire-surface px-[9px] py-[5px] text-[12.5px] text-wire-primary outline-none transition-colors focus:border-wire-focus";

export function WireInspector({ className, style }: WireInspectorProps): ReactElement {
  const diagram = useWireDiagram();
  const actions = useWireActions();
  const [selection] = useWireSelection();
  const node = selection.nodeIds.length === 1
    ? diagram.nodes.find((candidate) => candidate.id === selection.nodeIds[0])
    : undefined;

  if (!node) {
    return (
      <aside
        className={cx("grid gap-2 rounded-md bg-wire-surface p-3", className)}
        style={style}
      >
        <Eyebrow muted>Options</Eyebrow>
        <p className="text-[12.5px] text-wire-tertiary">No node selected</p>
      </aside>
    );
  }

  return (
    <aside
      className={cx("grid gap-3 rounded-md bg-wire-surface p-3", className)}
      style={style}
    >
      <Eyebrow muted>Options</Eyebrow>

      <label className="grid">
        <span className={FIELD_LABEL}>Title</span>
        <input
          className={TEXT_INPUT}
          value={node.title}
          onChange={(event) => actions.dispatch({ type: "node.patch", id: node.id, patch: { title: event.target.value } })}
        />
      </label>

      <label className="grid">
        <span className={FIELD_LABEL}>Description</span>
        <textarea
          className={cx(TEXT_INPUT, "min-h-[68px] resize-y")}
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

      <footer className="flex justify-end pt-1">
        <StatusPill kind="valid">Valid</StatusPill>
      </footer>
    </aside>
  );
}
