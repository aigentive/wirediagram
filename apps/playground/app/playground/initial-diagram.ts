import type { WireDiagram } from "@aigentive/wire-core";

export const INITIAL_PLAYGROUND_DIAGRAM: WireDiagram = {
  version: 1,
  id: "playground",
  title: "LLM Wire Playground",
  description: "A starter flow for editing Wire JSON with an LLM tool loop.",
  layout: "LR",
  nodes: [
    {
      id: "user-prompt",
      kind: "trigger",
      title: "User prompt",
      description: "Chat request on the right"
    },
    {
      id: "llm-json",
      kind: "ai",
      title: "LLM drafts Wire JSON",
      description: "The model can only update the canonical diagram",
      from: "user-prompt",
      tone: "ai",
      model: "openai"
    },
    {
      id: "mcp-tools",
      kind: "tool",
      title: "Wire MCP tools",
      description: "save_diagram, validate, get_diagram_json",
      from: "llm-json",
      tone: "info",
      ref: "wire-mcp"
    },
    {
      id: "editable-canvas",
      kind: "human",
      title: "Editable canvas",
      description: "Drag nodes, wire handles, or edit JSON",
      from: "mcp-tools",
      tone: "success"
    }
  ],
  edges: []
};
