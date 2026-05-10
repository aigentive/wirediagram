export type WireChatGuardResult =
  | { ok: true }
  | { ok: false; code: "wire-intent-required"; message: string };

export const WIRE_CHAT_REFUSAL =
  "I can only create, update, or manage Wire diagrams. Rephrase this as a diagram-building request.";

const DIAGRAM_TERMS = [
  "wire",
  "diagram",
  "flowchart",
  "workflow",
  "flow",
  "wireframe",
  "graph",
  "canvas",
  "node",
  "nodes",
  "edge",
  "edges",
  "branch",
  "branches",
  "card",
  "cards",
  "layout",
  "swimlane",
  "pipeline",
  "process map"
];

const EDIT_TERMS = [
  "connect",
  "disconnect",
  "route",
  "reroute",
  "rearrange",
  "align",
  "layout",
  "style",
  "color",
  "resize",
  "group",
  "ungroup",
  "validate"
];

const CONTEXTUAL_EDIT_TERMS = [
  "add",
  "remove",
  "delete",
  "rename",
  "change",
  "update",
  "move",
  "make",
  "simplify",
  "expand",
  "improve",
  "fix",
  "reset",
  "rebuild"
];

const DIAGRAM_REFERENTS = [
  ...DIAGRAM_TERMS,
  "it",
  "this",
  "that",
  "them",
  "selected",
  "all",
  "label",
  "title",
  "description",
  "tone",
  "color",
  "style",
  "left",
  "right",
  "top",
  "bottom",
  "horizontal",
  "vertical",
  "before",
  "after",
  "between",
  "from",
  "to"
];

const DIAGRAM_ADJECTIVES = [
  "yellow",
  "red",
  "green",
  "blue",
  "purple",
  "bigger",
  "smaller",
  "clearer",
  "cleaner",
  "simpler",
  "horizontal",
  "vertical"
];

const OFF_TOPIC_PATTERNS = [
  /\b(weather|news|stock|price|sports|recipe|meal plan)\b/,
  /\b(write|draft|compose|translate|summarize)\b.*\b(poem|essay|email|article|blog|story|song|lyrics)\b/,
  /\b(code|implement|debug|refactor|typescript|python|sql|react component|next\.js)\b/,
  /\b(calculate|solve)\b.*\b(equation|math|homework)\b/
];

const PROMPT_CONTROL_PATTERNS = [
  /\b(ignore|override|forget|disregard)\b.{0,80}\b(instruction|system|developer|policy|prompt|tool)\b/,
  /\b(system prompt|developer message|hidden instruction|tool schema|tool_choice|chain of thought|api key|environment variable|secret)\b/,
  /\b(reveal|print|show|leak|dump)\b.{0,80}\b(prompt|instruction|secret|api key|environment|tool)\b/,
  /\b(you are now|act as|roleplay as|jailbreak|do anything now)\b/
];

export function guardWireChatRequest(message: string): WireChatGuardResult {
  const normalized = normalizeMessage(message);
  if (!normalized) return reject();

  const wireIntent = hasWireIntent(normalized);
  const offTopic = OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized));
  const promptControl = PROMPT_CONTROL_PATTERNS.some((pattern) => pattern.test(normalized));

  if (!wireIntent) return reject();
  if (offTopic && !hasExplicitDiagramTerm(normalized)) return reject();
  if (promptControl && !hasExplicitDiagramTerm(normalized)) return reject();

  return { ok: true };
}

function hasWireIntent(normalized: string): boolean {
  if (hasExplicitDiagramTerm(normalized)) return true;
  if (EDIT_TERMS.some((term) => hasWord(normalized, term))) return true;
  if (
    CONTEXTUAL_EDIT_TERMS.some((term) => hasWord(normalized, term)) &&
    DIAGRAM_REFERENTS.some((term) => hasWord(normalized, term))
  ) {
    return true;
  }
  if (/^make\s+(it|this|that|the\s+(diagram|wire|node|edge|card|flow))/i.test(normalized)) return true;
  if (DIAGRAM_ADJECTIVES.some((term) => hasWord(normalized, term))) return true;
  return false;
}

function hasExplicitDiagramTerm(normalized: string): boolean {
  return DIAGRAM_TERMS.some((term) => hasWord(normalized, term));
}

function hasWord(value: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(value);
}

function normalizeMessage(message: string): string {
  return message.toLowerCase().replace(/\s+/g, " ").trim();
}

function reject(): WireChatGuardResult {
  return {
    ok: false,
    code: "wire-intent-required",
    message: WIRE_CHAT_REFUSAL
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
