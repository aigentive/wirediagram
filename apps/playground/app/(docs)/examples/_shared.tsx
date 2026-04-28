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
      className="absolute inset-0 z-30 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="grid w-full max-w-[420px] gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <header className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
            aria-label="Close"
          >
            <X size={14} aria-hidden strokeWidth={2.25} />
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
      <aside className="grid place-items-center border-l border-slate-200 bg-slate-50 p-6 text-center text-[13px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        <div className="grid justify-items-center gap-2">
          <MousePointerClick size={20} aria-hidden strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />
          <span>Click a node to inspect it</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="grid content-start gap-3 border-l border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <header className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Inspector
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="grid h-7 w-7 place-items-center rounded border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
        >
          <X size={14} aria-hidden strokeWidth={2.25} />
        </button>
      </header>
      <WireOptionPanel catalog={OPTIONS} nodeId={nodeId} />
    </aside>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
      <MousePointerClick size={12} aria-hidden strokeWidth={2.25} className="text-slate-400 dark:text-slate-500" />
      {children}
    </p>
  );
}

export function ClickableHint({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300">
      <MousePointerClick size={11} aria-hidden strokeWidth={2.25} />
      {children}
    </span>
  );
}
