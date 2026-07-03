import type { CSSProperties, ReactElement } from "react";
import type { WireNode } from "@aigentive/wire-core";
import { useWireActions, useWireDiagram, useWireSelection, useWireValidation } from "../hooks.js";
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
import { Eyebrow } from "../primitives/Eyebrow.js";
import { StatusPill } from "../primitives/StatusPill.js";
import { cx } from "./classes.js";

export interface WireOptionPanelProps {
  catalog: WireOptionCatalog;
  /** Explicit node id. When omitted, the panel follows the current single-node selection. */
  nodeId?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const CONTROL_CLASS =
  "w-full min-h-8 rounded-md border border-wire bg-wire-surface px-[9px] py-[5px] text-[12.5px] text-wire-primary outline-none transition-colors focus:border-wire-focus";
const FIELD_LABEL_CLASS = "text-[11.5px] font-medium text-wire-secondary mb-[3px]";

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
  const validation = useWireValidation();
  const selectedNodeId = nodeId ?? (selection.nodeIds.length === 1 ? selection.nodeIds[0] : undefined);
  const node = selectedNodeId
    ? diagram.nodes.find((candidate) => candidate.id === selectedNodeId)
    : undefined;

  if (!node) {
    return (
      <aside
        className={cx("wire-option-panel wire-option-panel--styled grid gap-2 rounded-md bg-wire-surface p-3", className)}
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
      className={cx("wire-option-panel wire-option-panel--styled grid gap-3 rounded-md bg-wire-surface p-3", className)}
      style={style}
    >
      <Eyebrow muted>{title}</Eyebrow>
      {specs.length === 0 ? (
        <p className="text-[12.5px] leading-snug text-wire-tertiary">No options</p>
      ) : null}
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
      {isValid ? (
        <footer className="flex justify-end pt-1">
          <StatusPill kind="valid">Valid</StatusPill>
        </footer>
      ) : null}
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

  return (
    <label className="wire-option-field grid">
      <span className={cx("wire-option-field__label", FIELD_LABEL_CLASS)}>{label}</span>
      {type === "textarea" ? (
        <textarea
          value={rawValue === undefined ? "" : String(rawValue)}
          placeholder={spec.placeholder}
          onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
          className={cx("wire-option-control", CONTROL_CLASS, "min-h-[72px] resize-y")}
        />
      ) : type === "boolean" ? (
        <input
          type="checkbox"
          checked={Boolean(rawValue)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-[18px] w-[18px] accent-wire-focus"
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
          className={cx("wire-option-control", CONTROL_CLASS)}
        />
      ) : type === "select" ? (
        <select
          value={choiceValueToInputValue(rawValue)}
          onChange={(event) => onChange(valueFromChoice(event.target.value, spec.options ?? []))}
          className={cx("wire-option-control", CONTROL_CLASS)}
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
          className={cx("wire-option-control", CONTROL_CLASS)}
        />
      )}
      {spec.description ? (
        <span className="wire-option-field__description mt-1 text-[11px] leading-snug text-wire-tertiary">{spec.description}</span>
      ) : null}
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
