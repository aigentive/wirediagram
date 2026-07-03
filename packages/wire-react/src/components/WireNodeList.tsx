import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { WireNode } from "@aigentive/wire-core";
import { useWireDiagram, useWireEvents, useWireSelection } from "../hooks.js";
import { KindChip } from "../primitives/KindChip.js";
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
        "wire-node-list wire-node-list--styled grid content-start gap-1 overflow-auto rounded-lg bg-wire-surface p-1.5",
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
            aria-selected={selected}
            className={cx(
              "wire-node-list__item grid w-full grid-cols-[auto_1fr] items-start gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-wire-sunken",
              selected ? "bg-wire-sunken" : "bg-transparent"
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
                <span className="row-span-2 mt-0.5">
                  <KindChip kind={node.kind} />
                </span>
                <strong className="text-[13px] font-bold leading-snug text-wire-primary">{node.title}</strong>
                <span className="text-[11px] text-wire-tertiary">{node.kind}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
