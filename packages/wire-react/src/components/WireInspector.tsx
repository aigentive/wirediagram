import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement
} from "react";
import type { EdgeRouting, NodeStyle, Tone, WireEdge, WireNode } from "@aigentive/wire-core";
import { useWireActions, useWireDiagram, useWireSelection, useWireValidation } from "../hooks.js";
import { wireOptionSpecsForNode, type WireOptionCatalog } from "../options.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { StatusPill } from "../primitives/StatusPill.js";
import { cx, themeClass, type WireColorMode } from "./classes.js";
import { resolveWireInspectionTarget, type WireInspectedTarget } from "./inspectionState.js";
import { WireOptionFieldList, type WireOptionFieldListProps } from "./optionFields.js";

type WireInspectorTab = "configure" | "style" | "validation" | "json" | "edge";

export interface WireInspectorProps {
  nodeId?: string;
  edgeId?: string;
  optionCatalog?: WireOptionCatalog;
  tabs?: WireInspectorTab[];
  defaultTab?: WireInspectorTab;
  readOnly?: boolean;
  renderField?: WireOptionFieldListProps["renderField"];
  renderSection?: WireOptionFieldListProps["renderSection"];
  onOptionCommit?: (context: {
    node: NonNullable<WireOptionFieldListProps["node"]>;
    option: Parameters<WireOptionFieldListProps["onCommit"]>[1];
    value: unknown;
    action: Parameters<WireOptionFieldListProps["onCommit"]>[0];
  }) => void;
  ariaLabelConfig?: {
    tab?: (tab: WireInspectorTab) => string;
    optionField?: (option: Parameters<NonNullable<WireOptionFieldListProps["renderField"]>>[0]["option"]) => string;
    section?: (section: string) => string;
  };
  colorMode?: WireColorMode;
  unstyled?: boolean;
  classNames?: {
    root?: string;
    tabs?: string;
    tab?: string;
    panel?: string;
    field?: string;
    section?: string;
    validation?: string;
    json?: string;
    edge?: string;
  };
  className?: string;
  style?: CSSProperties;
}

const FIELD_LABEL = "text-[11.5px] font-medium text-wire-secondary mb-[3px]";
const TEXT_INPUT =
  "w-full rounded-md border border-wire bg-wire-page px-2.5 py-[6px] text-[12.5px] text-wire-primary outline-none transition-colors placeholder:text-wire-muted hover:border-wire-strong focus:border-wire-focus focus:bg-wire-surface focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)] disabled:cursor-not-allowed disabled:bg-wire-sunken disabled:text-wire-muted";
const INLINE_INPUT =
  "w-full rounded-md border border-wire bg-wire-page px-2.5 py-1.5 text-[12px] text-wire-primary outline-none transition-colors placeholder:text-wire-muted hover:border-wire-strong focus:border-wire-focus focus:bg-wire-surface focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)] disabled:cursor-not-allowed disabled:bg-wire-sunken disabled:text-wire-muted";
const CLEAR_BUTTON =
  "shrink-0 rounded-md border border-wire bg-wire-surface px-2 py-1 text-[11px] font-medium text-wire-tertiary transition-colors hover:border-wire-strong hover:text-wire-primary disabled:cursor-not-allowed disabled:text-wire-muted";

type CardStyleMode = Tone | "custom";

const CARD_STYLE_PRESETS: Record<Tone, Pick<NodeStyle, "fill" | "stroke" | "textColor">> = {
  default: { fill: "#ffffff", stroke: "#d4d4d8", textColor: "#18181b" },
  success: { fill: "#ecfdf5", stroke: "#34d399", textColor: "#064e3b" },
  warning: { fill: "#fffbeb", stroke: "#fbbf24", textColor: "#78350f" },
  error: { fill: "#fff1f2", stroke: "#fb7185", textColor: "#881337" },
  info: { fill: "#f0f9ff", stroke: "#38bdf8", textColor: "#0c4a6e" },
  ai: { fill: "#f5f3ff", stroke: "#a78bfa", textColor: "#4c1d95" }
};

const TONE_OPTIONS: Array<{ value: CardStyleMode; label: string }> = [
  { value: "default", label: "Neutral" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "info", label: "Info" },
  { value: "ai", label: "AI" },
  { value: "custom", label: "Custom" }
];

const EDGE_ROUTING_OPTIONS: Array<{ value: EdgeRouting; label: string }> = [
  { value: "bezier", label: "Bezier" },
  { value: "smoothstep", label: "Smoothstep" },
  { value: "step", label: "Step" },
  { value: "straight", label: "Straight" }
];

export function WireInspector({
  nodeId,
  edgeId,
  optionCatalog,
  tabs,
  defaultTab,
  readOnly = false,
  renderField,
  renderSection,
  onOptionCommit,
  ariaLabelConfig,
  colorMode,
  unstyled = false,
  classNames,
  className,
  style
}: WireInspectorProps): ReactElement {
  const diagram = useWireDiagram();
  const actions = useWireActions();
  const [selection] = useWireSelection();
  const validation = useWireValidation();
  const target = useMemo(
    () => resolveWireInspectionTarget(diagram, { nodeId, edgeId, selection }),
    [diagram, edgeId, nodeId, selection]
  );
  const targetKey = inspectedTargetKey(target);
  const applicableTabs = useMemo(
    () => applicableInspectorTabs(target, tabs, optionCatalog, defaultTab),
    [defaultTab, optionCatalog, tabs, target]
  );
  const [activeTab, setActiveTab] = useState<WireInspectorTab>(() => applicableTabs[0] ?? "style");

  useEffect(() => {
    setActiveTab(applicableTabs[0] ?? "style");
  }, [applicableTabs, targetKey]);

  const rootClass = cx(
    "wire-inspector",
    !unstyled && "wire-inspector--styled grid gap-3 rounded-md bg-wire-surface p-3",
    themeClass(colorMode),
    classNames?.root,
    className
  );

  if (target.type === "empty" || target.type === "mixed" || applicableTabs.length === 0) {
    return (
      <aside className={rootClass} style={style} data-wire-theme={colorMode}>
        <Eyebrow muted>Options</Eyebrow>
        <p className="text-[12.5px] text-wire-tertiary">
          {target.type === "mixed" ? "Select one node or edge" : "No node selected"}
        </p>
      </aside>
    );
  }

  const activePanel = applicableTabs.includes(activeTab) ? activeTab : applicableTabs[0]!;

  return (
    <aside className={rootClass} style={style} data-wire-theme={colorMode}>
      <Eyebrow muted>Options</Eyebrow>
      <div
        className={cx("wire-inspector__tabs", !unstyled && "flex gap-1 border-b border-wire", classNames?.tabs)}
        role="tablist"
        aria-label="Inspector panels"
        onKeyDown={(event) => handleTabKeyDown(event, applicableTabs, activePanel, setActiveTab)}
      >
        {applicableTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={tabId(tab)}
            aria-selected={activePanel === tab}
            aria-controls={panelId(tab)}
            tabIndex={activePanel === tab ? 0 : -1}
            className={cx(
              "wire-inspector__tab",
              !unstyled && "rounded-t-md px-2 py-1.5 text-[12px] font-bold text-wire-tertiary aria-selected:bg-wire-page aria-selected:text-wire-primary",
              classNames?.tab
            )}
            onClick={() => setActiveTab(tab)}
          >
            {labelForTab(tab, ariaLabelConfig)}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        id={panelId(activePanel)}
        aria-labelledby={tabId(activePanel)}
        className={cx("wire-inspector__panel", !unstyled && "grid gap-3", classNames?.panel)}
        tabIndex={-1}
      >
        {activePanel === "configure" && target.type === "node" ? (
          <ConfigurePanel
            diagram={diagram}
            node={target.node}
            optionCatalog={optionCatalog}
            readOnly={readOnly}
            renderField={renderField}
            renderSection={renderSection}
            onOptionCommit={onOptionCommit}
            classNames={classNames}
          />
        ) : null}
        {activePanel === "style" && target.type === "node" ? (
          <StylePanel node={target.node} readOnly={readOnly} onPatch={(patch) => actions.dispatch({ type: "node.patch", id: target.node.id, patch })} />
        ) : null}
        {activePanel === "validation" ? (
          <ValidationPanel target={target} className={classNames?.validation} />
        ) : null}
        {activePanel === "json" ? (
          <JsonPanel target={target} className={classNames?.json} />
        ) : null}
        {activePanel === "edge" && target.type === "edge" ? (
          <EdgePanel
            target={target}
            readOnly={readOnly}
            className={classNames?.edge}
            onPatch={(id, patch) => actions.dispatch({ type: "edge.patch", id, patch })}
          />
        ) : null}
      </section>
    </aside>
  );
}

function ConfigurePanel({
  diagram,
  node,
  optionCatalog,
  readOnly,
  renderField,
  renderSection,
  onOptionCommit,
  classNames
}: {
  diagram: ReturnType<typeof useWireDiagram>;
  node: WireNode;
  optionCatalog?: WireOptionCatalog;
  readOnly: boolean;
  renderField?: WireOptionFieldListProps["renderField"];
  renderSection?: WireOptionFieldListProps["renderSection"];
  onOptionCommit?: WireInspectorProps["onOptionCommit"];
  classNames?: WireInspectorProps["classNames"];
}): ReactElement {
  const actions = useWireActions();
  const specs = wireOptionSpecsForNode(optionCatalog, node);
  if (specs.length === 0) {
    return <p className="text-[12.5px] leading-snug text-wire-tertiary">No options</p>;
  }
  return (
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
  );
}

function StylePanel({
  node,
  readOnly,
  onPatch
}: {
  node: WireNode;
  readOnly: boolean;
  onPatch(patch: Record<string, unknown>): void;
}): ReactElement {
  const appearance = cardAppearanceForNode(node);
  const patchNode = (patch: Record<string, unknown>): void => {
    if (!readOnly) onPatch(patch);
  };
  const dispatchStylePatch = (patch: Partial<Record<keyof NodeStyle, unknown>>): void => {
    const stripsTone = "fill" in patch || "stroke" in patch || "textColor" in patch;
    patchNode(stripsTone
      ? { tone: null, ...patchNodeStyle(node, patch) }
      : patchNodeStyle(node, patch));
  };

  return (
    <>
      <label className="grid">
        <span className={cx("wire-field-label", FIELD_LABEL)}>Title</span>
        <input
          className={TEXT_INPUT}
          value={node.title}
          readOnly={readOnly}
          onChange={(event) => patchNode({ title: event.target.value })}
        />
      </label>

      <label className="grid">
        <span className={cx("wire-field-label", FIELD_LABEL)}>Description</span>
        <textarea
          className={cx(TEXT_INPUT, "min-h-[68px] resize-y")}
          value={node.description ?? ""}
          readOnly={readOnly}
          onChange={(event) => patchNode({ description: event.target.value || null })}
        />
      </label>

      <section className="grid gap-2 border-t border-wire pt-3">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow muted>Appearance</Eyebrow>
          {(node.tone || node.style) ? (
            <button
              type="button"
              className={CLEAR_BUTTON}
              disabled={readOnly}
              onClick={() => patchNode({ tone: null, style: null })}
            >
              Reset
            </button>
          ) : null}
        </div>

        <label className="grid">
          <span className={cx("wire-field-label", FIELD_LABEL)}>Card style</span>
          <select
            className={TEXT_INPUT}
            value={appearance.mode}
            disabled={readOnly}
            onChange={(event) => {
              const mode = event.target.value as CardStyleMode;
              if (mode === "custom") return;
              patchNode({ tone: mode, style: styleForPreset(mode) });
            }}
          >
            {TONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <ColorField label="Fill" value={appearance.fill} fallback="#ffffff" canClear={Boolean(node.style?.fill)} readOnly={readOnly} onChange={(value) => dispatchStylePatch({ fill: value })} />
        <ColorField label="Border" value={appearance.stroke} fallback="#d4d4d8" canClear={Boolean(node.style?.stroke)} readOnly={readOnly} onChange={(value) => dispatchStylePatch({ stroke: value })} />
        <ColorField label="Text" value={appearance.textColor} fallback="#18181b" canClear={Boolean(node.style?.textColor)} readOnly={readOnly} onChange={(value) => dispatchStylePatch({ textColor: value })} />

        <div className="grid grid-cols-2 gap-2">
          <label className="grid">
            <span className={cx("wire-field-label", FIELD_LABEL)}>Border width</span>
            <NumberFieldWithUnit value={appearance.strokeWidth} placeholder="1" unit="px" min={0} step={0.5} readOnly={readOnly} onChange={(value) => dispatchStylePatch({ strokeWidth: value })} />
          </label>

          <label className="grid">
            <span className={cx("wire-field-label", FIELD_LABEL)}>Radius</span>
            <NumberFieldWithUnit value={appearance.borderRadius} placeholder="8" unit="px" min={0} step={1} readOnly={readOnly} onChange={(value) => dispatchStylePatch({ borderRadius: value })} />
          </label>
        </div>

        <label className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[12.5px] font-medium text-wire-secondary">Shadow</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-600"
            checked={appearance.shadow}
            disabled={readOnly}
            onChange={(event) => dispatchStylePatch({ shadow: event.target.checked })}
          />
        </label>
      </section>
    </>
  );
}

function ValidationPanel({ target, className }: { target: WireInspectedTarget; className?: string }): ReactElement {
  const validation = useWireValidation();
  const targetIssues = validation.issues.filter((issue) => {
    if (target.type === "node") return issue.nodeId === target.node.id;
    if (target.type === "edge") return issue.edgeId === target.edge.id;
    return false;
  });
  if (targetIssues.length === 0) {
    return (
      <footer className={cx("wire-inspector__validation flex justify-end pt-1", className)}>
        <StatusPill kind="valid">Valid</StatusPill>
      </footer>
    );
  }
  return (
    <div className={cx("wire-inspector__validation grid gap-2", className)}>
      {targetIssues.map((issue, index) => (
        <p key={`${issue.code}:${index}`} className="rounded-md border border-wire bg-wire-page p-2 text-[12px] leading-snug text-wire-primary">
          {issue.message}
        </p>
      ))}
    </div>
  );
}

function JsonPanel({ target, className }: { target: WireInspectedTarget; className?: string }): ReactElement {
  const value = target.type === "node"
    ? target.node
    : target.type === "edge"
      ? target.explicitEdge ?? target.edge
      : {};
  return (
    <pre className={cx("wire-inspector__json overflow-auto rounded-md border border-wire bg-wire-page p-2 text-[11px] leading-relaxed text-wire-primary", className)}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function EdgePanel({
  target,
  readOnly,
  className,
  onPatch
}: {
  target: Extract<WireInspectedTarget, { type: "edge" }>;
  readOnly: boolean;
  className?: string;
  onPatch(id: string, patch: Record<string, unknown>): void;
}): ReactElement {
  const edge = target.explicitEdge;
  const disabled = readOnly || !target.editable || !edge?.id;
  const patchEdge = (patch: Record<string, unknown>): void => {
    if (!disabled && edge?.id) onPatch(edge.id, patch);
  };

  return (
    <div className={cx("wire-inspector__edge grid gap-3", className)}>
      {!target.editable ? (
        <p className="rounded-md border border-wire bg-wire-page p-2 text-[12px] leading-snug text-wire-tertiary">
          This edge is derived from a node relationship and is read-only until it is stored as an explicit edge.
        </p>
      ) : null}
      <label className="grid">
        <span className={cx("wire-field-label", FIELD_LABEL)}>Label</span>
        <input
          className={TEXT_INPUT}
          value={edge?.label ?? target.edge.label ?? ""}
          readOnly={disabled}
          onChange={(event) => patchEdge({ label: event.target.value || null })}
        />
      </label>
      <label className="grid">
        <span className={cx("wire-field-label", FIELD_LABEL)}>Tone</span>
        <select
          className={TEXT_INPUT}
          value={edge?.tone ?? ""}
          disabled={disabled}
          onChange={(event) => patchEdge({ tone: event.target.value || null })}
        >
          <option value="">Unset</option>
          {TONE_OPTIONS.filter((option) => option.value !== "custom").map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid">
        <span className={cx("wire-field-label", FIELD_LABEL)}>Routing</span>
        <select
          className={TEXT_INPUT}
          value={edge?.routing ?? ""}
          disabled={disabled}
          onChange={(event) => patchEdge({ routing: event.target.value || null })}
        >
          <option value="">Default</option>
          {EDGE_ROUTING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <ReadOnlyEdgeFacts edge={target.edge} explicitEdge={edge} />
    </div>
  );
}

function ReadOnlyEdgeFacts({ edge, explicitEdge }: { edge: Extract<WireInspectedTarget, { type: "edge" }>["edge"]; explicitEdge?: WireEdge }): ReactElement {
  return (
    <dl className="grid gap-1 rounded-md border border-wire bg-wire-page p-2 text-[11.5px] text-wire-secondary">
      <EdgeFact label="From" value={edge.from} />
      <EdgeFact label="To" value={edge.to} />
      <EdgeFact label="Branch" value={edge.branch ?? edge.fromBranch} />
      <EdgeFact label="Source side" value={edge.fromHandle} />
      <EdgeFact label="Target side" value={edge.toHandle} />
      <EdgeFact label="Style" value={explicitEdge?.style ? JSON.stringify(explicitEdge.style) : undefined} />
      <EdgeFact label="Label style" value={explicitEdge?.labelStyle ? JSON.stringify(explicitEdge.labelStyle) : undefined} />
      <EdgeFact label="Data" value={explicitEdge?.data ? JSON.stringify(explicitEdge.data) : undefined} />
    </dl>
  );
}

function EdgeFact({ label, value }: { label: string; value: unknown }): ReactElement {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <dt className="font-bold">{label}</dt>
      <dd className="min-w-0 break-words font-mono">{value === undefined || value === "" ? "Unset" : String(value)}</dd>
    </div>
  );
}

function NumberFieldWithUnit({
  value,
  placeholder,
  unit,
  min,
  step,
  readOnly,
  onChange
}: {
  value: number | undefined;
  placeholder?: string;
  unit: string;
  min?: number;
  step?: number;
  readOnly: boolean;
  onChange: (value: number | null) => void;
}): ReactElement {
  return (
    <div className="relative">
      <input
        className={cx(INLINE_INPUT, "pr-7")}
        type="number"
        min={min}
        step={step}
        placeholder={placeholder}
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(event) => {
          const next = optionalNumberFromInput(event.target.value);
          if (next !== undefined) onChange(next);
        }}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center font-mono text-[10.5px] font-semibold text-wire-muted">
        {unit}
      </span>
    </div>
  );
}

function ColorField({
  label,
  value,
  fallback,
  canClear,
  readOnly,
  onChange
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  canClear?: boolean;
  readOnly: boolean;
  onChange: (value: string | null) => void;
}): ReactElement {
  return (
    <div className="grid gap-1">
      <span className={cx("wire-field-label", FIELD_LABEL)}>{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <input
          aria-label={`${label} swatch`}
          type="color"
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-wire bg-wire-surface p-0.5"
          value={hexColorOrFallback(value, fallback)}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          aria-label={`${label} color`}
          className={cx(TEXT_INPUT, "min-w-0 flex-1 font-mono text-[11.5px]")}
          value={value ?? ""}
          placeholder={fallback}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value || null)}
        />
        {canClear ? (
          <button type="button" className={CLEAR_BUTTON} disabled={readOnly} onClick={() => onChange(null)}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function applicableInspectorTabs(
  target: WireInspectedTarget,
  requestedTabs: WireInspectorTab[] | undefined,
  optionCatalog: WireOptionCatalog | undefined,
  defaultTab: WireInspectorTab | undefined
): WireInspectorTab[] {
  const base: WireInspectorTab[] = target.type === "node"
    ? [
      ...(optionCatalog ? ["configure" as const] : []),
      "style" as const,
      "validation" as const,
      "json" as const
    ]
    : target.type === "edge"
      ? ["edge" as const, "validation" as const, "json" as const]
      : [];
  const filtered = requestedTabs ? requestedTabs.filter((tab) => base.includes(tab)) : base;
  if (filtered.length === 0) return [];
  if (defaultTab && filtered.includes(defaultTab)) {
    return [defaultTab, ...filtered.filter((tab) => tab !== defaultTab)];
  }
  if (target.type === "edge" && filtered.includes("edge")) {
    return ["edge", ...filtered.filter((tab) => tab !== "edge")];
  }
  return filtered;
}

function handleTabKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  tabs: WireInspectorTab[],
  activeTab: WireInspectorTab,
  setActiveTab: (tab: WireInspectorTab) => void
): void {
  const currentIndex = tabs.indexOf(activeTab);
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else return;

  event.preventDefault();
  const next = tabs[nextIndex]!;
  setActiveTab(next);
  const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='tab']");
  buttons[nextIndex]?.focus();
}

function labelForTab(tab: WireInspectorTab, config: WireInspectorProps["ariaLabelConfig"]): string {
  const override = config?.tab?.(tab)?.trim();
  if (override) return override;
  switch (tab) {
    case "configure": return "Configure";
    case "style": return "Style";
    case "validation": return "Validation";
    case "json": return "JSON";
    case "edge": return "Edge";
  }
}

function tabId(tab: WireInspectorTab): string {
  return `wire-inspector-tab-${tab}`;
}

function panelId(tab: WireInspectorTab): string {
  return `wire-inspector-panel-${tab}`;
}

function inspectedTargetKey(target: WireInspectedTarget): string {
  if (target.type === "node") return `node:${target.node.id}`;
  if (target.type === "edge") return `edge:${target.edge.id}`;
  return target.type;
}

function patchNodeStyle(
  node: WireNode,
  patch: Partial<Record<keyof NodeStyle, unknown>>
): Record<string, unknown> {
  const nextStyle: Record<string, unknown> = { ...(node.style ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") delete nextStyle[key];
    else nextStyle[key] = value;
  }
  return { style: Object.keys(nextStyle).length > 0 ? nextStyle : null };
}

function cardAppearanceForNode(node: WireNode): {
  mode: CardStyleMode;
  fill: string | undefined;
  stroke: string | undefined;
  textColor: string | undefined;
  strokeWidth: number | undefined;
  borderRadius: number | undefined;
  shadow: boolean;
} {
  const preset = node.tone ? CARD_STYLE_PRESETS[node.tone] : undefined;
  const style = node.style;
  const mode = cardStyleModeForNode(node, preset);
  return {
    mode,
    fill: style?.fill ?? preset?.fill,
    stroke: style?.stroke ?? preset?.stroke,
    textColor: style?.textColor ?? preset?.textColor,
    strokeWidth: style?.strokeWidth,
    borderRadius: style?.borderRadius,
    shadow: style?.shadow ?? true
  };
}

function cardStyleModeForNode(
  node: WireNode,
  preset: Pick<NodeStyle, "fill" | "stroke" | "textColor"> | undefined
): CardStyleMode {
  if (!node.tone) return node.style ? "custom" : "default";
  if (!node.style) return node.tone;
  return styleMatchesPreset(node.style, preset) ? node.tone : "custom";
}

function styleMatchesPreset(
  style: NodeStyle,
  preset: Pick<NodeStyle, "fill" | "stroke" | "textColor"> | undefined
): boolean {
  if (!preset) return false;
  if (style.strokeWidth !== undefined ||
    style.strokeDasharray !== undefined ||
    style.borderRadius !== undefined ||
    style.opacity !== undefined ||
    style.shadow !== undefined) {
    return false;
  }
  return (style.fill === undefined || style.fill === preset.fill) &&
    (style.stroke === undefined || style.stroke === preset.stroke) &&
    (style.textColor === undefined || style.textColor === preset.textColor);
}

function styleForPreset(tone: Tone): NodeStyle {
  const preset = CARD_STYLE_PRESETS[tone];
  return {
    fill: preset.fill,
    stroke: preset.stroke,
    textColor: preset.textColor
  };
}

function optionalNumberFromInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hexColorOrFallback(value: string | undefined, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "") ? value! : fallback;
}
