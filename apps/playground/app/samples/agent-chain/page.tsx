"use client";

import { useCallback, useState } from "react";
import type { WireDiagram } from "@aigentive/wire-core";
import {
  WireWorkspace,
  type WireOptionCatalog
} from "@aigentive/wire-react";

const AGENT_OPTIONS: WireOptionCatalog = {
  trigger: [
    { key: "event", label: "Event", placeholder: "ticket.created" }
  ],
  ai: [
    {
      key: "model",
      label: "Model",
      storage: "node",
      type: "select",
      options: ["gpt-4.1", "gpt-4.1-mini", "o4-mini"]
    },
    { key: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1 },
    { key: "maxSteps", label: "Max steps", type: "number", min: 1, max: 20, step: 1 },
    { key: "mode", label: "Mode", type: "select", options: ["classify", "plan", "respond"] }
  ],
  retrieval: [
    { key: "index", label: "Index" },
    { key: "topK", label: "Top K", type: "number", min: 1, max: 20, step: 1 }
  ],
  tool: [
    { key: "ref", label: "Tool ref", storage: "node" },
    { key: "requiresApproval", label: "Requires approval", type: "boolean" }
  ],
  action: [
    { key: "channel", label: "Channel", type: "select", options: ["email", "chat", "ticket"] }
  ]
};

const INITIAL_DIAGRAM: WireDiagram = {
  version: 1,
  id: "agent-chain-sample",
  title: "Support agent chain",
  layout: "LR",
  nodes: [
    {
      id: "intake-stage",
      kind: "group",
      title: "Intake",
      children: ["webhook", "triage"]
    },
    {
      id: "webhook",
      kind: "trigger",
      title: "Ticket webhook",
      parent: "intake-stage",
      data: { options: { event: "ticket.created" } }
    },
    {
      id: "triage",
      kind: "ai",
      title: "Classify request",
      from: "webhook",
      parent: "intake-stage",
      model: "gpt-4.1-mini",
      data: { options: { mode: "classify", temperature: 0.1 } }
    },
    {
      id: "resolve-stage",
      kind: "group",
      title: "Resolve",
      children: ["retrieve", "plan", "update-ticket", "respond"]
    },
    {
      id: "retrieve",
      kind: "retrieval",
      title: "Retrieve context",
      from: "triage",
      parent: "resolve-stage",
      data: { options: { index: "kb-production", topK: 5 } }
    },
    {
      id: "plan",
      kind: "ai",
      title: "Plan answer",
      from: "retrieve",
      parent: "resolve-stage",
      model: "gpt-4.1",
      data: { options: { mode: "plan", temperature: 0.3, maxSteps: 4 } }
    },
    {
      id: "update-ticket",
      kind: "tool",
      title: "Update ticket",
      from: "plan",
      parent: "resolve-stage",
      ref: "zendesk.update_ticket",
      data: { options: { requiresApproval: true } }
    },
    {
      id: "respond",
      kind: "action",
      title: "Send response",
      from: "update-ticket",
      parent: "resolve-stage",
      tone: "success",
      data: { options: { channel: "email" } }
    }
  ],
  edges: [],
  metadata: {
    wireReact: {
      sample: "agent-chain"
    }
  }
};

export default function AgentChainSamplePage() {
  const [diagram, setDiagram] = useState<WireDiagram>(INITIAL_DIAGRAM);
  const [inspectedNodeId, setInspectedNodeId] = useState<string | undefined>();
  const handleChange = useCallback((next: WireDiagram) => setDiagram(next), []);

  return (
    <WireWorkspace
      diagram={diagram}
      onChange={handleChange}
      optionCatalog={AGENT_OPTIONS}
      inspectNodeId={inspectedNodeId}
      onInspectNodeChange={setInspectedNodeId}
      title={(
        <div className="grid gap-1.5">
          <a href="/" className="text-[13px] font-bold text-blue-900 no-underline">
            Wire
          </a>
          <span>Agent chain</span>
        </div>
      )}
      subtitle={`${diagram.nodes.length} nodes`}
      canvasProps={{ showMiniMap: true }}
    />
  );
}
