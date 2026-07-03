import type { CSSProperties, ReactElement } from "react";
import type { WireNode } from "@aigentive/wire-core";
import { useWireActions, useWireDiagram } from "../hooks.js";
import { Eyebrow } from "../primitives/Eyebrow.js";
import { KindChip } from "../primitives/KindChip.js";
import { cx } from "./classes.js";

const DEFAULT_KINDS: WireNode["kind"][] = [
  "trigger",
  "ai",
  "tool",
  "action",
  "condition",
  "human",
  "retrieval",
  "memory",
  "guardrail",
  "end",
  "note",
  "group"
];

const KIND_LABEL: Record<WireNode["kind"], string> = {
  trigger: "Trigger",
  action: "Action",
  ai: "AI",
  tool: "Tool",
  condition: "Condition",
  human: "Human",
  memory: "Memory",
  retrieval: "Retrieval",
  guardrail: "Guardrail",
  end: "End",
  note: "Note",
  group: "Group"
};

export interface WirePaletteProps {
  kinds?: WireNode["kind"][];
  unstyled?: boolean;
  classNames?: {
    root?: string;
    item?: string;
  };
  className?: string;
  style?: CSSProperties;
}

export function WirePalette({
  kinds = DEFAULT_KINDS,
  unstyled = false,
  classNames,
  className,
  style
}: WirePaletteProps): ReactElement {
  const diagram = useWireDiagram();
  const actions = useWireActions();

  return (
    <div
      className={cx(
        "wire-palette",
        !unstyled && "wire-palette--styled grid gap-1.5 rounded-lg bg-wire-surface p-3",
        classNames?.root,
        className
      )}
      style={style}
    >
      <Eyebrow muted>Add node</Eyebrow>
      {kinds.map((kind) => (
        <button
          key={kind}
          type="button"
          className={cx(
            "wire-palette__item",
            !unstyled && "flex h-9 w-full items-center gap-2 rounded-md border border-wire bg-wire-surface px-3 text-left text-[13px] font-semibold text-wire-primary transition-colors hover:border-wire-strong hover:bg-wire-sunken",
            classNames?.item
          )}
          onClick={() => {
            const id = nextNodeId(kind, diagram.nodes.map((node) => node.id));
            actions.dispatch({
              type: "node.add",
              node: {
                id,
                kind,
                title: titleForKind(kind),
                branches: kind === "condition" ? ["yes", "no"] : undefined
              }
            });
          }}
        >
          <KindChip kind={kind} />
          <span className="flex-1">{KIND_LABEL[kind]}</span>
        </button>
      ))}
    </div>
  );
}

function nextNodeId(kind: WireNode["kind"], existing: Iterable<string>): string {
  const used = new Set(existing);
  for (let i = 1; i < 1000; i += 1) {
    const id = `${kind}-${i}`;
    if (!used.has(id)) return id;
  }
  return `${kind}-${Date.now().toString(36)}`;
}

function titleForKind(kind: WireNode["kind"]): string {
  return KIND_LABEL[kind];
}
