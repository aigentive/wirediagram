import type { WireDiagram } from "@aigentive/wire-core";

/**
 * Built-in diagram templates exposed via the `wire://templates/{name}`
 * resource. Each template returns canonical Wire JSON the agent can clone
 * + tweak rather than starting from scratch.
 */
export const TEMPLATES: Record<string, WireDiagram> = {
  "agent-workflow": {
    version: 1,
    layout: "LR",
    title: "Agent workflow template",
    nodes: [
      { id: "trigger", kind: "trigger", title: "Trigger" },
      { id: "plan", kind: "ai", title: "Plan", from: "trigger", model: "gpt-4.1" },
      { id: "tools", kind: "tool", title: "Tools", from: "plan" },
      { id: "respond", kind: "action", title: "Respond", from: "tools", tone: "success" }
    ],
    edges: []
  },
  "approval-flow": {
    version: 1,
    layout: "LR",
    title: "Approval flow template",
    nodes: [
      { id: "incoming", kind: "trigger", title: "Incoming request" },
      { id: "classify", kind: "ai", title: "Classify", from: "incoming", model: "gpt-4.1" },
      {
        id: "needs-approval",
        kind: "condition",
        title: "Needs approval?",
        from: "classify",
        branches: ["yes", "no"]
      },
      {
        id: "approve",
        kind: "human",
        title: "Approve",
        from: "needs-approval.yes"
      },
      {
        id: "auto-respond",
        kind: "action",
        title: "Auto respond",
        from: "needs-approval.no",
        tone: "success"
      },
      { id: "send", kind: "action", title: "Send", from: ["approve", "auto-respond"] }
    ],
    edges: []
  },
  "rag-pipeline": {
    version: 1,
    layout: "LR",
    title: "RAG pipeline template",
    nodes: [
      { id: "user-query", kind: "trigger", title: "User query" },
      { id: "retrieve", kind: "retrieval", title: "Retrieve docs", from: "user-query" },
      { id: "guardrail", kind: "guardrail", title: "Safety check", from: "retrieve" },
      { id: "generate", kind: "ai", title: "Generate answer", from: "guardrail", model: "gpt-4.1" },
      { id: "memory-write", kind: "memory", title: "Write to memory", from: "generate" },
      { id: "respond", kind: "action", title: "Respond", from: "generate", tone: "success" }
    ],
    edges: []
  }
};

export function listTemplates(): Array<{ name: string; title?: string; nodeCount: number }> {
  return Object.entries(TEMPLATES).map(([name, d]) => {
    const out: { name: string; title?: string; nodeCount: number } = { name, nodeCount: d.nodes.length };
    if (d.title !== undefined) out.title = d.title;
    return out;
  });
}

export function getTemplate(name: string): WireDiagram | undefined {
  const t = TEMPLATES[name];
  return t ? structuredClone(t) : undefined;
}
