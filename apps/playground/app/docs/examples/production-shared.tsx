"use client";

import type { ReactNode } from "react";
import type { WireDiagram } from "@aigentive/wire-core";
import type { WireOptionCatalog } from "@aigentive/wire-react";

export const PRODUCTION_OPTIONS: WireOptionCatalog = {
  "*": [
    {
      key: "owner",
      label: "Owner",
      storage: "data",
      section: "Ownership",
      placeholder: "revops"
    }
  ],
  trigger: [
    {
      key: "event",
      label: "Event",
      storage: "data",
      section: "Runtime",
      placeholder: "lead.created"
    }
  ],
  ai: [
    {
      key: "model",
      label: "Model",
      storage: "node",
      type: "select",
      section: "Runtime",
      options: ["balanced-model", "careful-model", "compact-model"]
    },
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      min: 0,
      max: 2,
      step: 0.1,
      section: "Runtime",
      width: "half"
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      section: "Runtime",
      width: "half",
      options: ["classify", "rank", "draft"]
    }
  ],
  condition: [
    {
      key: "threshold",
      label: "Threshold",
      type: "number",
      min: 0,
      max: 100,
      step: 5,
      section: "Routing",
      width: "half"
    },
    {
      key: "strategy",
      label: "Strategy",
      type: "select",
      section: "Routing",
      width: "half",
      options: ["score", "segment", "owner"]
    }
  ],
  action: [
    {
      key: "channel",
      label: "Channel",
      type: "select",
      section: "Delivery",
      options: ["crm", "email", "chat", "ticket"]
    },
    {
      key: "retry",
      label: "Retry on failure",
      type: "boolean",
      section: "Delivery"
    }
  ]
};

export const PRODUCTION_DIAGRAM: WireDiagram = {
  version: 1,
  id: "production-agent-router",
  title: "Production agent router",
  layout: "LR",
  nodes: [
    {
      id: "lead",
      kind: "trigger",
      title: "Lead received",
      description: "CRM webhook",
      data: { options: { event: "lead.created", owner: "revops" } }
    },
    {
      id: "qualify",
      kind: "ai",
      title: "Qualify lead",
      description: "Rank fit and urgency",
      model: "balanced-model",
      data: { options: { mode: "rank", temperature: 0.2, owner: "ai-platform" } }
    },
    {
      id: "route",
      kind: "condition",
      title: "Route account",
      branches: ["enterprise", "smb"],
      data: { options: { threshold: 70, strategy: "score", owner: "revops" } }
    },
    {
      id: "enterprise",
      kind: "action",
      title: "Create account plan",
      tone: "success",
      data: { options: { channel: "crm", retry: true, owner: "sales" } }
    },
    {
      id: "smb",
      kind: "action",
      title: "Send nurture",
      tone: "info",
      data: { options: { channel: "email", retry: false, owner: "marketing" } }
    }
  ],
  edges: [
    { id: "edge-lead-qualify", from: "lead", to: "qualify", label: "event" },
    { id: "edge-qualify-route", from: "qualify", to: "route", label: "score", routing: "smoothstep" },
    { id: "edge-route-enterprise", from: "route", to: "enterprise", branch: "enterprise", label: "enterprise", tone: "success" },
    { id: "edge-route-smb", from: "route", to: "smb", branch: "smb", label: "smb", tone: "info" }
  ]
};

export function ExampleSurface({
  height = 420,
  children
}: {
  height?: number;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-wire bg-wire-surface" style={{ height }}>
      {children}
    </div>
  );
}

export function ExampleMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="grid gap-0.5 rounded-md border border-wire bg-wire-surface px-2.5 py-2">
      <span className="wire-eyebrow wire-eyebrow--muted">{label}</span>
      <span className="font-mono text-[12px] text-wire-primary">{value}</span>
    </span>
  );
}
