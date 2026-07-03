import type { CSSProperties, ReactElement } from "react";
import { useWireActions, useWireDiagram, useWireSelection, useWireValidation } from "../hooks.js";
import {
  wireOptionSpecsForNode,
  type WireOptionCatalog
} from "../options.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { StatusPill } from "../primitives/StatusPill.js";
import { cx } from "./classes.js";
import { WireOptionFieldList, type WireOptionFieldListProps } from "./optionFields.js";

export interface WireOptionPanelProps {
  catalog: WireOptionCatalog;
  /** Explicit node id. When omitted, the panel follows the current single-node selection. */
  nodeId?: string;
  title?: string;
  readOnly?: boolean;
  renderField?: WireOptionFieldListProps["renderField"];
  renderSection?: WireOptionFieldListProps["renderSection"];
  onOptionCommit?: (context: {
    node: NonNullable<WireOptionFieldListProps["node"]>;
    option: Parameters<WireOptionFieldListProps["onCommit"]>[1];
    value: unknown;
    action: Parameters<WireOptionFieldListProps["onCommit"]>[0];
  }) => void;
  classNames?: {
    root?: string;
    field?: string;
    section?: string;
    validation?: string;
  };
  unstyled?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function WireOptionPanel({
  catalog,
  nodeId,
  title = "Options",
  readOnly = false,
  renderField,
  renderSection,
  onOptionCommit,
  classNames,
  unstyled = false,
  className,
  style
}: WireOptionPanelProps): ReactElement {
  const diagram = useWireDiagram();
  const actions = useWireActions();
  const [selection] = useWireSelection();
  const validation = useWireValidation();
  const selectedNodeId = nodeId ?? (selection.nodeIds.length === 1 ? selection.nodeIds[0] : undefined);
  const node = selectedNodeId
    ? diagram.nodes.find((candidate) => candidate.id === selectedNodeId)
    : undefined;

  if (!node) {
    return (
      <aside
        className={cx(
          "wire-option-panel",
          !unstyled && "wire-option-panel--styled grid gap-2 rounded-md bg-wire-surface p-3",
          classNames?.root,
          className
        )}
        style={style}
      >
        <Eyebrow muted>{title}</Eyebrow>
        <p className="text-[12.5px] leading-snug text-wire-tertiary">No node selected</p>
      </aside>
    );
  }

  const specs = wireOptionSpecsForNode(catalog, node);
  const isValid = validation.issues.every((issue) => issue.nodeId !== node.id);

  return (
    <aside
      className={cx(
        "wire-option-panel",
        !unstyled && "wire-option-panel--styled grid gap-3 rounded-md bg-wire-surface p-3",
        classNames?.root,
        className
      )}
      style={style}
    >
      <Eyebrow muted>{title}</Eyebrow>
      {specs.length === 0 ? (
        <p className="text-[12.5px] leading-snug text-wire-tertiary">No options</p>
      ) : null}
      <WireOptionFieldList
        diagram={diagram}
        node={node}
        specs={specs}
        readOnly={readOnly}
        renderField={renderField}
        renderSection={renderSection}
        classNames={classNames}
        onCommit={(action, option, value) => {
          actions.dispatch(action);
          onOptionCommit?.({ node, option, value, action });
        }}
      />
      {isValid ? (
        <footer className="flex justify-end pt-1">
          <StatusPill kind="valid">Valid</StatusPill>
        </footer>
      ) : null}
    </aside>
  );
}
