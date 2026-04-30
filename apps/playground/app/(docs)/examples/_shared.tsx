"use client";

import { useEffect, type ReactNode } from "react";
import { MousePointerClick, X } from "lucide-react";
import type { WireDiagram } from "@aigentive/wire-core";
import { WireCanvas, WireOptionPanel, type WireOptionCatalog } from "@aigentive/wire-react";

export const OPTIONS: WireOptionCatalog = {
  "*": [{ key: "owner", label: "Owner", storage: "data", placeholder: "ops" }],
  trigger: [{ key: "event", label: "Event", placeholder: "ticket.created" }],
  ai: [
    {
      key: "model",
      label: "Model",
      storage: "node",
      type: "select",
      options: ["gpt-4.1", "gpt-4.1-mini", "o4-mini"]
    },
    { key: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1 },
    { key: "mode", label: "Mode", type: "select", options: ["classify", "plan", "respond"] }
  ],
  action: [
    { key: "channel", label: "Channel", type: "select", options: ["email", "chat", "ticket", "slack"] }
  ]
};

export const ROUTER_DIAGRAM: WireDiagram = {
  version: 1,
  id: "sample-router",
  title: "Router",
  layout: "LR",
  nodes: [
    { id: "in", kind: "trigger", title: "Webhook", data: { options: { event: "ticket.created" } } },
    { id: "to-sales", kind: "action", title: "Notify sales", from: "in", tone: "success", data: { options: { channel: "slack" } } },
    { id: "to-support", kind: "action", title: "Open ticket", from: "in", tone: "warning", data: { options: { channel: "ticket" } } },
    { id: "to-ops", kind: "action", title: "Page on-call", from: "in", tone: "error", data: { options: { channel: "chat" } } }
  ],
  edges: []
};

export const VERTICAL_DIAGRAM: WireDiagram = {
  version: 1,
  id: "sample-vertical",
  title: "Vertical",
  layout: "TB",
  nodes: [
    { id: "in", kind: "trigger", title: "Webhook", data: { options: { event: "ticket.created" } } },
    { id: "ai", kind: "ai", title: "Plan answer", from: "in", model: "gpt-4.1", data: { options: { mode: "plan", temperature: 0.3 } } },
    { id: "out", kind: "action", title: "Send reply", from: "ai", tone: "success", data: { options: { channel: "email" } } }
  ],
  edges: []
};

export const HORIZONTAL_DIAGRAM: WireDiagram = {
  version: 1,
  id: "sample-horizontal",
  title: "Horizontal",
  layout: "LR",
  nodes: [
    { id: "in", kind: "trigger", title: "Webhook", data: { options: { event: "ticket.created" } } },
    { id: "ai", kind: "ai", title: "Plan answer", from: "in", model: "gpt-4.1", data: { options: { mode: "plan", temperature: 0.3 } } },
    { id: "out", kind: "action", title: "Send reply", from: "ai", tone: "success", data: { options: { channel: "email" } } }
  ],
  edges: []
};

export function CanvasPane({ height }: { height: number }) {
  return (
    <div className="relative w-full" style={{ height }}>
      <WireCanvas
        mode="view"
        fitView
        fitViewPadding={0.16}
        showControls={false}
        showMiniMap={false}
        optionCatalog={OPTIONS}
      />
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-slate-950/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="grid w-full max-w-[420px] gap-3 rounded-lg border border-wire bg-wire-surface p-5 shadow-wire-md"
      >
        <header className="flex items-center justify-between gap-2">
          <span className="wire-eyebrow wire-eyebrow--muted">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded border border-wire text-wire-secondary hover:border-wire-strong hover:text-wire-primary"
            aria-label="Close"
          >
            <X size={14} aria-hidden strokeWidth={1.5} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function ContextSidebar({
  nodeId,
  onClose
}: {
  nodeId: string | undefined;
  onClose: () => void;
}) {
  if (!nodeId) {
    return (
      <aside className="grid place-items-center border-l border-wire bg-wire-sunken p-6 text-center text-[13px] text-wire-tertiary">
        <div className="grid justify-items-center gap-2">
          <MousePointerClick size={20} aria-hidden strokeWidth={1.5} className="text-wire-muted" />
          <span>Click a node to inspect it</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="grid content-start gap-3 border-l border-wire bg-wire-sunken p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="wire-eyebrow wire-eyebrow--muted">
          Inspector
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="grid h-7 w-7 place-items-center rounded border border-wire bg-wire-surface text-wire-secondary hover:border-wire-strong hover:text-wire-primary"
        >
          <X size={14} aria-hidden strokeWidth={1.5} />
        </button>
      </header>
      <WireOptionPanel catalog={OPTIONS} nodeId={nodeId} />
    </aside>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-1.5 text-[12px] text-wire-tertiary">
      <MousePointerClick size={12} aria-hidden strokeWidth={1.5} className="text-wire-muted" />
      {children}
    </p>
  );
}

export function ClickableHint({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-wire bg-wire-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-wire-secondary shadow-wire-sm">
      <MousePointerClick size={11} aria-hidden strokeWidth={1.5} />
      {children}
    </span>
  );
}
