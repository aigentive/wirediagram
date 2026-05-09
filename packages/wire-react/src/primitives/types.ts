import type { NodeKind } from "@aigentive/wire-core";

export type WireNodeKind = NodeKind;

export type WireKindChipKey =
  | "trigger"
  | "ai"
  | "retrieval"
  | "tool"
  | "action"
  | "human"
  | "note"
  | "condition"
  | "end";

export function kindChipKey(kind: WireNodeKind): WireKindChipKey {
  switch (kind) {
    case "trigger":
      return "trigger";
    case "ai":
      return "ai";
    case "retrieval":
      return "retrieval";
    case "tool":
      return "tool";
    case "action":
      return "action";
    case "human":
      return "human";
    case "note":
      return "note";
    case "condition":
      return "condition";
    case "guardrail":
      return "action";
    case "memory":
    case "group":
    case "end":
    default:
      return "end";
  }
}

export function kindChipLabel(kind: WireNodeKind): string {
  switch (kind) {
    case "trigger":
      return "TRIGGER";
    case "action":
      return "ACTION";
    case "ai":
      return "AI";
    case "tool":
      return "TOOL";
    case "condition":
      return "IF";
    case "human":
      return "HUMAN";
    case "memory":
      return "MEMORY";
    case "retrieval":
      return "RETRIEVAL";
    case "guardrail":
      return "GUARD";
    case "end":
      return "END";
    case "note":
      return "NOTE";
    case "group":
      return "GROUP";
    default:
      return String(kind).toUpperCase();
  }
}
