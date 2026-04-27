import type { CSSProperties, ReactElement } from "react";
import type { WireNode } from "@aigentive/wire-core";
import { useWireActions, useWireDiagram, useWireSelection } from "../hooks.js";
import {
  inferOptionType,
  optionChoiceKey,
  optionChoiceLabel,
  optionChoiceValue,
  patchWireOption,
  readWireOption,
  wireOptionSpecsForNode,
  type WireOptionCatalog,
  type WireOptionChoice,
  type WireOptionPrimitive,
  type WireOptionSpec
} from "../options.js";
import { cx } from "./classes.js";

export interface WireOptionPanelProps {
  catalog: WireOptionCatalog;
  /** Explicit node id. When omitted, the panel follows the current single-node selection. */
  nodeId?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function WireOptionPanel({
  catalog,
  nodeId,
  title = "Options",
  className,
  style
}: WireOptionPanelProps): ReactElement {
  const diagram = useWireDiagram();
  const actions = useWireActions();
  const [selection] = useWireSelection();
  const selectedNodeId = nodeId ?? (selection.nodeIds.length === 1 ? selection.nodeIds[0] : undefined);
  const node = selectedNodeId
    ? diagram.nodes.find((candidate) => candidate.id === selectedNodeId)
    : undefined;

  if (!node) {
    return (
      <aside className={cx("grid gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm", className)} style={style}>
        <div className="text-xs font-extrabold uppercase tracking-normal text-slate-600">{title}</div>
        <div className="text-[13px] leading-snug text-slate-500">No node selected</div>
      </aside>
    );
  }

  const specs = wireOptionSpecsForNode(catalog, node);

  return (
    <aside className={cx("grid gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm", className)} style={style}>
      <div className="text-xs font-extrabold uppercase tracking-normal text-slate-600">{title}</div>
      {specs.length === 0 ? <div className="text-[13px] leading-snug text-slate-500">No options</div> : null}
      {specs.map((spec) => (
        <OptionField
          key={`${spec.storage ?? "data.options"}:${spec.key}`}
          node={node}
          spec={spec}
          onChange={(value) => {
            actions.dispatch({
              type: "node.patch",
              id: node.id,
              patch: patchWireOption(node, spec, value)
            });
          }}
        />
      ))}
    </aside>
  );
}

function OptionField({
  node,
  spec,
  onChange
}: {
  node: WireNode;
  spec: WireOptionSpec;
  onChange: (value: unknown) => void;
}): ReactElement {
  const type = inferOptionType(spec);
  const rawValue = readWireOption(node, spec) ?? spec.defaultValue;
  const label = spec.label ?? labelFromKey(spec.key);
  const controlClass = "min-h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] font-medium text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15";

  return (
    <label className="grid gap-1 text-[13px] font-bold text-slate-800">
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea
          value={rawValue === undefined ? "" : String(rawValue)}
          placeholder={spec.placeholder}
          onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
          className={cx(controlClass, "min-h-[72px] resize-y")}
        />
      ) : type === "boolean" ? (
        <input
          type="checkbox"
          checked={Boolean(rawValue)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-[18px] w-[18px] accent-blue-600"
        />
      ) : type === "number" ? (
        <input
          type="number"
          value={typeof rawValue === "number" ? rawValue : rawValue === undefined ? "" : Number(rawValue)}
          placeholder={spec.placeholder}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
          className={controlClass}
        />
      ) : type === "select" ? (
        <select
          value={choiceValueToInputValue(rawValue)}
          onChange={(event) => onChange(valueFromChoice(event.target.value, spec.options ?? []))}
          className={controlClass}
        >
          <option value="">Unset</option>
          {(spec.options ?? []).map((choice) => (
            <option key={optionChoiceKey(choice)} value={optionChoiceKey(choice)}>
              {optionChoiceLabel(choice)}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={rawValue === undefined ? "" : String(rawValue)}
          placeholder={spec.placeholder}
          onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
          className={controlClass}
        />
      )}
      {spec.description ? <span className="text-[11px] font-medium leading-snug text-slate-500">{spec.description}</span> : null}
    </label>
  );
}

function valueFromChoice(value: string, choices: WireOptionChoice[]): WireOptionPrimitive | null {
  if (value === "") return null;
  const match = choices.find((choice) => optionChoiceKey(choice) === value);
  return match === undefined ? value : optionChoiceValue(match);
}

function choiceValueToInputValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

function labelFromKey(key: string): string {
  return key
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
