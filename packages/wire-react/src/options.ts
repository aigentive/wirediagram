import type { WireDiagram, WireNode } from "@aigentive/wire-core";

export type WireOptionInputType = "text" | "textarea" | "number" | "boolean" | "select";
export type WireOptionStorage = "data.options" | "data" | "node";
export type WireOptionPrimitive = string | number | boolean;
export type WireOptionChoice =
  | WireOptionPrimitive
  | {
    label: string;
    value: WireOptionPrimitive;
  };

type WireOptionContext = {
  node: WireNode;
  diagram: WireDiagram;
  value: unknown;
  option: WireOptionSpec;
};

type WireOptionPredicate = boolean | ((context: WireOptionContext) => boolean);
type WireOptionValidationIssue = { message: string; severity?: "error" | "warning" | "info" };

export interface WireOptionSpec {
  /** Stable key. Defaults to data.options[key] storage. */
  key: string;
  label?: string;
  type?: WireOptionInputType;
  description?: string;
  placeholder?: string;
  options?: WireOptionChoice[];
  defaultValue?: WireOptionPrimitive;
  min?: number;
  max?: number;
  step?: number;
  storage?: WireOptionStorage;
  group?: string;
  section?: string;
  order?: number;
  width?: "full" | "half" | "third";
  required?: boolean;
  readOnly?: WireOptionPredicate;
  disabled?: WireOptionPredicate;
  hidden?: WireOptionPredicate;
  validate?: (context: WireOptionContext) =>
    | WireOptionValidationIssue
    | WireOptionValidationIssue[]
    | null
    | undefined;
  parse?: (input: unknown, context: WireOptionContext) => unknown;
  format?: (value: unknown, context: WireOptionContext) => unknown;
  commitMode?: "change" | "blur" | "submit";
  debounceMs?: number;
}

export type WireOptionCatalog = Partial<Record<WireNode["kind"] | "*", WireOptionSpec[]>>;

export function wireOptionSpecsForNode(
  catalog: WireOptionCatalog | undefined,
  node: WireNode
): WireOptionSpec[] {
  if (!catalog) return [];
  return [...(catalog["*"] ?? []), ...(catalog[node.kind] ?? [])]
    .map((spec, index) => ({ spec, index }))
    .sort((left, right) => (left.spec.order ?? left.index) - (right.spec.order ?? right.index) || left.index - right.index)
    .map(({ spec }) => spec);
}

export function wireNodeOptions(node: WireNode): Record<string, unknown> {
  const options = node.data?.options;
  return isRecord(options) ? options : {};
}

export function readWireOption(node: WireNode, spec: WireOptionSpec): unknown {
  const storage = spec.storage ?? "data.options";
  if (storage === "node") return (node as unknown as Record<string, unknown>)[spec.key];
  if (storage === "data") return node.data?.[spec.key];
  return wireNodeOptions(node)[spec.key];
}

export function patchWireOption(
  node: WireNode,
  spec: WireOptionSpec,
  value: unknown
): Record<string, unknown> {
  const storage = spec.storage ?? "data.options";
  const nextValue = value === undefined ? null : value;

  if (storage === "node") {
    return { [spec.key]: nextValue };
  }

  const currentData = { ...(node.data ?? {}) };

  if (storage === "data") {
    if (nextValue === null) delete currentData[spec.key];
    else currentData[spec.key] = nextValue;
    return { data: Object.keys(currentData).length > 0 ? currentData : null };
  }

  const currentOptions = isRecord(currentData.options) ? { ...currentData.options } : {};
  if (nextValue === null) delete currentOptions[spec.key];
  else currentOptions[spec.key] = nextValue;

  if (Object.keys(currentOptions).length > 0) currentData.options = currentOptions;
  else delete currentData.options;

  return { data: Object.keys(currentData).length > 0 ? currentData : null };
}

export function optionChoiceLabel(choice: WireOptionChoice): string {
  return typeof choice === "object" ? choice.label : String(choice);
}

export function optionChoiceValue(choice: WireOptionChoice): WireOptionPrimitive {
  return typeof choice === "object" ? choice.value : choice;
}

export function optionChoiceKey(choice: WireOptionChoice): string {
  return String(optionChoiceValue(choice));
}

export function inferOptionType(spec: WireOptionSpec): WireOptionInputType {
  if (spec.type) return spec.type;
  if (spec.options?.length) return "select";
  if (typeof spec.defaultValue === "number") return "number";
  if (typeof spec.defaultValue === "boolean") return "boolean";
  return "text";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
