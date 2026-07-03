import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode
} from "react";
import type { WireAction, WireDiagram, WireNode } from "@aigentive/wire-core";
import {
  inferOptionType,
  optionChoiceKey,
  optionChoiceLabel,
  optionChoiceValue,
  patchWireOption,
  readWireOption,
  type WireOptionChoice,
  type WireOptionPrimitive,
  type WireOptionSpec
} from "../options.js";
import { cx } from "./classes.js";

export interface WireOptionFieldRendererContext {
  fieldId: string;
  labelId: string;
  descriptionId?: string;
  errorId?: string;
  describedBy?: string;
  node: WireNode;
  diagram: WireDiagram;
  option: WireOptionSpec;
  value: unknown;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  issues: Array<{ message: string; severity?: "error" | "warning" | "info" }>;
  onChange(value: unknown): void;
  onCommit?(value: unknown): void;
}

export interface WireOptionSectionRendererContext {
  section: string;
  options: WireOptionSpec[];
  children: ReactNode;
}

export interface WireOptionFieldListProps {
  diagram: WireDiagram;
  node: WireNode;
  specs: WireOptionSpec[];
  readOnly?: boolean;
  renderField?: (context: WireOptionFieldRendererContext) => ReactNode;
  renderSection?: (context: WireOptionSectionRendererContext) => ReactNode;
  onCommit(action: WireAction, option: WireOptionSpec, value: unknown): void;
  classNames?: {
    field?: string;
    section?: string;
    validation?: string;
  };
}

const CONTROL_CLASS =
  "w-full min-h-8 rounded-md border border-wire bg-wire-surface px-[9px] py-[5px] text-[12.5px] text-wire-primary outline-none transition-colors focus:border-wire-focus disabled:cursor-not-allowed disabled:bg-wire-sunken disabled:text-wire-muted";
const FIELD_LABEL_CLASS = "text-[11.5px] font-medium text-wire-secondary mb-[3px]";
const SMALL_BUTTON_CLASS =
  "rounded-md border border-wire bg-wire-surface px-2 py-1 text-[11px] font-medium text-wire-tertiary transition-colors hover:border-wire-strong hover:text-wire-primary disabled:cursor-not-allowed disabled:text-wire-muted";

export function WireOptionFieldList({
  diagram,
  node,
  specs,
  readOnly = false,
  renderField,
  renderSection,
  onCommit,
  classNames
}: WireOptionFieldListProps): ReactElement {
  const visibleSpecs = useMemo(
    () => specs.filter((spec) => !resolveOptionBoolean(spec.hidden, spec, node, diagram, readWireOption(node, spec))),
    [diagram, node, specs]
  );
  const sections = useMemo(() => groupOptionSpecs(visibleSpecs), [visibleSpecs]);

  return (
    <>
      {sections.map((section) => {
        const children = section.options.map((spec) => (
          <WireOptionField
            key={`${spec.storage ?? "data.options"}:${spec.key}`}
            diagram={diagram}
            node={node}
            spec={spec}
            parentReadOnly={readOnly}
            renderField={renderField}
            onCommit={onCommit}
            className={classNames?.field}
            validationClassName={classNames?.validation}
          />
        ));

        if (!section.name) return <span key="__default" className="contents">{children}</span>;

        const sectionBody = (
          <fieldset className={cx("wire-option-section grid gap-2 border-t border-wire pt-3", classNames?.section)}>
            <legend className="wire-option-section__legend px-0 pr-2 text-[11px] font-bold uppercase tracking-normal text-wire-tertiary">
              {section.name}
            </legend>
            {children}
          </fieldset>
        );

        return (
          <span key={section.name} className="contents">
            {renderSection ? renderSection({ section: section.name, options: section.options, children: sectionBody }) : sectionBody}
          </span>
        );
      })}
    </>
  );
}

function WireOptionField({
  diagram,
  node,
  spec,
  parentReadOnly,
  renderField,
  onCommit,
  className,
  validationClassName
}: {
  diagram: WireDiagram;
  node: WireNode;
  spec: WireOptionSpec;
  parentReadOnly: boolean;
  renderField?: (context: WireOptionFieldRendererContext) => ReactNode;
  onCommit(action: WireAction, option: WireOptionSpec, value: unknown): void;
  className?: string;
  validationClassName?: string;
}): ReactElement | null {
  const rawValue = readWireOption(node, spec) ?? spec.defaultValue;
  const type = inferOptionType(spec);
  const label = spec.label ?? labelFromKey(spec.key);
  const fieldKey = `${node.id}-${spec.storage ?? "data-options"}-${spec.key}`.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const fieldId = `wire-option-${fieldKey}`;
  const labelId = `${fieldId}-label`;
  const descriptionId = spec.description ? `${fieldId}-description` : undefined;
  const [localIssue, setLocalIssue] = useState<{ message: string; severity?: "error" | "warning" | "info" } | undefined>();
  const externalIssues = evaluateOptionValidation(spec, node, diagram, rawValue);
  const issues = localIssue ? [localIssue, ...externalIssues] : externalIssues;
  const errorIssue = issues.find((issue) => (issue.severity ?? "error") === "error");
  const errorId = errorIssue ? `${fieldId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const disabled = resolveOptionBoolean(spec.disabled, spec, node, diagram, rawValue);
  const optionReadOnly = !disabled && (parentReadOnly || resolveOptionBoolean(spec.readOnly, spec, node, diagram, rawValue));
  const required = Boolean(spec.required);
  const commitMode = spec.commitMode ?? "change";
  const [pendingInput, setPendingInput] = useState(() => formatInputValue(rawValue, spec, node, diagram, type));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPendingInput(formatInputValue(rawValue, spec, node, diagram, type));
    setDirty(false);
    setLocalIssue(undefined);
  }, [diagram, node, rawValue, spec, type]);

  useEffect(() => {
    if (!dirty || disabled || optionReadOnly || commitMode !== "change" || !spec.debounceMs || type === "boolean") return undefined;
    const handle = setTimeout(() => {
      commitInput(pendingInput);
    }, spec.debounceMs);
    return () => clearTimeout(handle);
  }, [commitMode, dirty, disabled, optionReadOnly, pendingInput, spec.debounceMs, type]);

  if (resolveOptionBoolean(spec.hidden, spec, node, diagram, rawValue)) return null;

  const actionForValue = (value: unknown): WireAction => ({
    type: "node.patch",
    id: node.id,
    patch: patchWireOption(node, spec, value)
  });

  const commitParsedValue = (value: unknown): void => {
    const validationIssues = validateParsedOptionValue(value, spec, node, diagram);
    const blockingIssue = validationIssues.find((issue) => (issue.severity ?? "error") === "error");
    if (blockingIssue) {
      setLocalIssue(blockingIssue);
      return;
    }
    setLocalIssue(undefined);
    setDirty(false);
    onCommit(actionForValue(value), spec, value);
  };

  const commitInput = (input: unknown): void => {
    if (disabled || optionReadOnly) return;
    const parsed = parseOptionInput(input, type, spec, node, diagram, rawValue);
    if (!parsed.ok) {
      setLocalIssue({ message: parsed.message });
      return;
    }
    commitParsedValue(parsed.value);
  };

  const updateInput = (value: unknown): void => {
    if (disabled || optionReadOnly) return;
    setPendingInput(value);
    setDirty(true);
    if (commitMode === "change" && !spec.debounceMs) commitInput(value);
  };

  const revert = (): void => {
    setPendingInput(formatInputValue(rawValue, spec, node, diagram, type));
    setDirty(false);
    setLocalIssue(undefined);
  };

  const rendererContext: WireOptionFieldRendererContext = {
    fieldId,
    labelId,
    descriptionId,
    errorId,
    describedBy,
    node,
    diagram,
    option: spec,
    value: rawValue,
    disabled,
    readOnly: optionReadOnly,
    required,
    issues,
    onChange: disabled || optionReadOnly ? () => undefined : updateInput,
    onCommit: disabled || optionReadOnly ? () => undefined : commitParsedValue
  };

  return (
    <div
      className={cx("wire-option-field grid", widthClass(spec.width), className)}
      data-wire-option-key={spec.key}
      data-wire-readonly={optionReadOnly || undefined}
      data-wire-disabled={disabled || undefined}
    >
      <span id={labelId} className={cx("wire-option-field__label", FIELD_LABEL_CLASS)}>
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {renderField ? (
        <div
          role="group"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          aria-disabled={disabled || undefined}
          aria-readonly={optionReadOnly || undefined}
        >
          {renderField(rendererContext)}
        </div>
      ) : renderNativeControl({
        type,
        spec,
        value: pendingInput,
        fieldId,
        labelId,
        describedBy,
        disabled,
        readOnly: optionReadOnly,
        required,
        invalid: Boolean(errorIssue),
        onInput: updateInput,
        onCommit: () => commitInput(pendingInput),
        onBlur: () => {
          if (commitMode === "blur" && dirty) commitInput(pendingInput);
        },
        onRevert: revert,
        commitMode,
        dirty
      })}
      {spec.description ? (
        <span id={descriptionId} className="wire-option-field__description mt-1 text-[11px] leading-snug text-wire-tertiary">
          {spec.description}
        </span>
      ) : null}
      {errorIssue ? (
        <span id={errorId} role="alert" className={cx("wire-option-field__error mt-1 text-[11px] leading-snug text-red-600", validationClassName)}>
          {errorIssue.message}
        </span>
      ) : null}
    </div>
  );
}

function renderNativeControl({
  type,
  spec,
  value,
  fieldId,
  labelId,
  describedBy,
  disabled,
  readOnly,
  required,
  invalid,
  onInput,
  onCommit,
  onBlur,
  onRevert,
  commitMode,
  dirty
}: {
  type: ReturnType<typeof inferOptionType>;
  spec: WireOptionSpec;
  value: unknown;
  fieldId: string;
  labelId: string;
  describedBy?: string;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  invalid: boolean;
  onInput(value: unknown): void;
  onCommit(): void;
  onBlur(): void;
  onRevert(): void;
  commitMode: "change" | "blur" | "submit";
  dirty: boolean;
}): ReactElement {
  const shared = {
    id: fieldId,
    "aria-labelledby": labelId,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    required,
    disabled,
    readOnly
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (commitMode !== "submit") return;
    if (event.key === "Escape") {
      event.preventDefault();
      onRevert();
    } else if (event.key === "Enter" && (event.currentTarget.tagName !== "TEXTAREA" || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onCommit();
    }
  };

  const control = type === "textarea" ? (
    <textarea
      {...shared}
      value={String(value ?? "")}
      placeholder={spec.placeholder}
      onChange={(event) => onInput(event.target.value)}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      className={cx("wire-option-control", CONTROL_CLASS, "min-h-[72px] resize-y")}
    />
  ) : type === "boolean" ? (
    <input
      {...shared}
      type="checkbox"
      checked={Boolean(value)}
      onChange={(event) => onInput(event.target.checked)}
      className="h-[18px] w-[18px] accent-wire-focus"
    />
  ) : type === "number" ? (
    <input
      {...shared}
      type="number"
      value={value === undefined || value === null ? "" : String(value)}
      placeholder={spec.placeholder}
      min={spec.min}
      max={spec.max}
      step={spec.step}
      onChange={(event) => onInput(event.target.value)}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      className={cx("wire-option-control", CONTROL_CLASS)}
    />
  ) : type === "select" ? (
    <select
      {...shared}
      value={choiceValueToInputValue(value)}
      onChange={(event) => onInput(valueFromChoice(event.target.value, spec.options ?? []))}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
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
      {...shared}
      value={String(value ?? "")}
      placeholder={spec.placeholder}
      onChange={(event) => onInput(event.target.value)}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      className={cx("wire-option-control", CONTROL_CLASS)}
    />
  );

  if (commitMode !== "submit") return control;
  return (
    <span className="grid gap-1.5">
      {control}
      <span className="wire-option-field__submit flex items-center gap-1.5">
        <button type="button" className={SMALL_BUTTON_CLASS} disabled={disabled || readOnly || !dirty} onClick={onCommit}>
          Apply
        </button>
        <button type="button" className={SMALL_BUTTON_CLASS} disabled={disabled || readOnly || !dirty} onClick={onRevert}>
          Revert
        </button>
      </span>
    </span>
  );
}

function groupOptionSpecs(specs: WireOptionSpec[]): Array<{ name: string; options: WireOptionSpec[] }> {
  const sections: Array<{ name: string; options: WireOptionSpec[] }> = [];
  for (const spec of specs) {
    const name = spec.section ?? spec.group ?? "";
    let section = sections.find((candidate) => candidate.name === name);
    if (!section) {
      section = { name, options: [] };
      sections.push(section);
    }
    section.options.push(spec);
  }
  return sections;
}

function evaluateOptionValidation(
  spec: WireOptionSpec,
  node: WireNode,
  diagram: WireDiagram,
  value: unknown
): Array<{ message: string; severity?: "error" | "warning" | "info" }> {
  if (!spec.validate) return [];
  const result = spec.validate({ node, diagram, value, option: spec });
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

function validateParsedOptionValue(
  value: unknown,
  spec: WireOptionSpec,
  node: WireNode,
  diagram: WireDiagram
): Array<{ message: string; severity?: "error" | "warning" | "info" }> {
  if (spec.required && (value === null || value === undefined || value === "")) {
    return [{ message: `${spec.label ?? labelFromKey(spec.key)} is required.` }];
  }
  if (!isJsonSerializable(value)) {
    return [{ message: `${spec.label ?? labelFromKey(spec.key)} must be serializable.` }];
  }
  return evaluateOptionValidation(spec, node, diagram, value);
}

function parseOptionInput(
  input: unknown,
  type: ReturnType<typeof inferOptionType>,
  spec: WireOptionSpec,
  node: WireNode,
  diagram: WireDiagram,
  currentValue: unknown
): { ok: true; value: unknown } | { ok: false; message: string } {
  let value = input;
  if (type === "text" || type === "textarea") {
    value = input === "" ? null : String(input);
  } else if (type === "number") {
    if (input === "" || input === null) value = null;
    else {
      const parsed = Number(input);
      if (!Number.isFinite(parsed)) return { ok: false, message: `${spec.label ?? labelFromKey(spec.key)} must be a valid number.` };
      value = parsed;
    }
  }

  if (spec.parse) {
    try {
      value = spec.parse(value, { node, diagram, value: currentValue, option: spec });
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : `${spec.label ?? labelFromKey(spec.key)} could not be parsed.` };
    }
  }

  return { ok: true, value };
}

function formatInputValue(
  value: unknown,
  spec: WireOptionSpec,
  node: WireNode,
  diagram: WireDiagram,
  type: ReturnType<typeof inferOptionType>
): unknown {
  const formatted = spec.format ? spec.format(value, { node, diagram, value, option: spec }) : value;
  if (type === "boolean") return Boolean(formatted);
  if (type === "number") return formatted === undefined || formatted === null ? "" : String(formatted);
  if (type === "select") return choiceValueToInputValue(formatted);
  return formatted ?? "";
}

function resolveOptionBoolean(
  predicate: WireOptionSpec["hidden"] | WireOptionSpec["disabled"] | WireOptionSpec["readOnly"],
  spec: WireOptionSpec,
  node: WireNode,
  diagram: WireDiagram,
  value: unknown
): boolean {
  if (typeof predicate === "function") {
    return Boolean(predicate({ node, diagram, value, option: spec }));
  }
  return Boolean(predicate);
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

function widthClass(width: WireOptionSpec["width"]): string | undefined {
  if (width === "half") return "wire-option-field--half";
  if (width === "third") return "wire-option-field--third";
  return undefined;
}

function isJsonSerializable(value: unknown): boolean {
  if (typeof value === "function" || typeof value === "symbol") return false;
  if (value === undefined) return true;
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function labelFromKey(key: string): string {
  return key
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
