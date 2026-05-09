import type { ReactNode } from "react";
import type { WireNode, Tone } from "@aigentive/wire-core";

/**
 * JSX facade for Wire nodes. These components don't render anything on their
 * own — they are consumed by `<Flow>` (or the `compile()` walker) which
 * reads their props and produces canonical Wire JSON.
 *
 * Why marker components instead of, say, plain `Diagram` data? It keeps the
 * dev surface familiar (React props + autocomplete + types per kind), and
 * lets people compose their own helpers like `<MyApprovalStep />` that
 * expand to a `<HumanNode />`.
 */

interface BaseNodeProps {
  id?: string;
  title: string;
  description?: string;
  tone?: Tone;
  from?: string | string[];
  after?: string | string[];
  attachedTo?: string;
  parent?: string;
  data?: Record<string, unknown>;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

interface TriggerProps extends BaseNodeProps {}
interface ActionProps extends BaseNodeProps {}
interface AIProps extends BaseNodeProps {
  model?: string;
  prompt?: string;
  tools?: string[];
}
interface ToolProps extends BaseNodeProps {
  ref?: string;
}
interface ConditionProps extends BaseNodeProps {
  branches: string[];
}
interface HumanProps extends BaseNodeProps {}
interface MemoryProps extends BaseNodeProps {}
interface RetrievalProps extends BaseNodeProps {}
interface GuardrailProps extends BaseNodeProps {}
interface EndProps extends BaseNodeProps {}
interface NoteProps extends BaseNodeProps {
  body?: string;
  /** JSX children also accepted for note body — flattened to text. */
  children?: ReactNode;
}
interface GroupProps extends BaseNodeProps {
  children?: ReactNode;
}

function defineNodeComponent<P>(kind: WireNode["kind"], displayName: string) {
  // Each call returns a fresh function so React identity is unique per kind
  // and `__wireKind` doesn't get overwritten on the shared closure.
  const Comp = (() => null) as unknown as ((props: P) => null) & { __wireKind: WireNode["kind"]; displayName: string };
  Comp.__wireKind = kind;
  Comp.displayName = displayName;
  return Comp;
}

export const TriggerNode = defineNodeComponent<TriggerProps>("trigger", "TriggerNode");
export const ActionNode = defineNodeComponent<ActionProps>("action", "ActionNode");
export const AINode = defineNodeComponent<AIProps>("ai", "AINode");
export const ToolNode = defineNodeComponent<ToolProps>("tool", "ToolNode");
export const ConditionNode = defineNodeComponent<ConditionProps>("condition", "ConditionNode");
export const HumanNode = defineNodeComponent<HumanProps>("human", "HumanNode");
export const MemoryNode = defineNodeComponent<MemoryProps>("memory", "MemoryNode");
export const RetrievalNode = defineNodeComponent<RetrievalProps>("retrieval", "RetrievalNode");
export const GuardrailNode = defineNodeComponent<GuardrailProps>("guardrail", "GuardrailNode");
export const EndNode = defineNodeComponent<EndProps>("end", "EndNode");
export const Note = defineNodeComponent<NoteProps>("note", "Note");
export const Group = defineNodeComponent<GroupProps>("group", "Group");

export type {
  TriggerProps,
  ActionProps,
  AIProps,
  ToolProps,
  ConditionProps,
  HumanProps,
  MemoryProps,
  RetrievalProps,
  GuardrailProps,
  EndProps,
  NoteProps,
  GroupProps
};
