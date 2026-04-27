import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { WireNode } from "@aigentive/wire-core";
import { useWireDiagram, useWireEvents, useWireSelection } from "../hooks.js";
import { cx } from "./classes.js";

export interface WireNodeListRenderContext {
  node: WireNode;
  selected: boolean;
}

export interface WireNodeListProps {
  includeGroups?: boolean;
  inspectOnClick?: boolean;
  selectOnClick?: boolean;
  renderItem?: (context: WireNodeListRenderContext) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function WireNodeList({
  includeGroups = false,
  inspectOnClick = true,
  selectOnClick = true,
  renderItem,
  className,
  style
}: WireNodeListProps): ReactElement {
  const diagram = useWireDiagram();
  const events = useWireEvents();
  const [selection, selectionActions] = useWireSelection();
  const selectedNodeIds = new Set(selection.nodeIds);
  const nodes = includeGroups ? diagram.nodes : diagram.nodes.filter((node) => node.kind !== "group");

  return (
    <div
      className={cx(
        "grid content-start gap-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2.5",
        className
      )}
      style={style}
    >
      {nodes.map((node) => {
        const selected = selectedNodeIds.has(node.id);
        return (
          <button
            key={node.id}
            type="button"
            className={cx(
              "grid gap-0.5 rounded-lg border bg-slate-50 px-2.5 py-2 text-left",
              selected ? "border-blue-600 ring-2 ring-blue-600/15" : "border-slate-200"
            )}
            onClick={() => {
              events.emit({ type: "node.click", source: "node-list", nodeId: node.id });
              if (inspectOnClick) events.emit({ type: "node.inspect", source: "node-list", nodeId: node.id });
              if (selectOnClick) {
                const nextSelection = { nodeIds: [node.id], edgeIds: [] };
                selectionActions.setSelection(nextSelection);
                events.emit({ type: "selection.change", source: "node-list", selection: nextSelection });
              }
            }}
          >
            {renderItem ? renderItem({ node, selected }) : (
              <>
                <strong className="text-[13px] leading-snug text-slate-950">{node.title}</strong>
                <span className="text-xs text-slate-500">{node.kind}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
