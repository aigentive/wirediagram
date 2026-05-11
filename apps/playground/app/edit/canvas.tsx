"use client";

import { useCallback, useState } from "react";
import type { WireDiagram } from "@aigentive/wire-core";
import {
  WireCanvas,
  WirePalette,
  WireProvider,
  WireToolbar,
  WireValidationPanel
} from "@aigentive/wire-react";
import { CanvasFrame } from "../_components/wire-editor";

interface EditCanvasProps {
  diagram: WireDiagram;
  label: string;
  shareToken?: string;
  initialPreviewHref?: string | null;
  importHref?: string | null;
  banner?: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function EditCanvas({
  diagram,
  label,
  shareToken,
  initialPreviewHref = null,
  importHref = null,
  banner = null
}: EditCanvasProps) {
  const [current, setCurrent] = useState<WireDiagram>(diagram);
  const [token, setToken] = useState<string | null>(null);
  const [previewHref, setPreviewHref] = useState<string | null>(initialPreviewHref);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const persist = useCallback(async (next: WireDiagram) => {
    setStatus("saving");
    try {
      const res = await fetch(shareToken ? `/api/shares/${encodeURIComponent(shareToken)}` : "/api/share", {
        method: shareToken ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(shareToken ? { diagram: next } : next)
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = (await res.json()) as {
        token?: string;
        viewToken?: string;
        urls?: { view?: string };
      };
      const nextToken = data.viewToken ?? data.token ?? null;
      setToken(nextToken);
      setPreviewHref(data.urls?.view ?? (nextToken ? `/preview/inline?d=${nextToken}` : initialPreviewHref));
      setStatus("saved");
      if (!shareToken && nextToken) {
        window.history.replaceState({}, "", `/edit/inline?d=${nextToken}`);
      }
    } catch {
      setStatus("error");
    }
  }, [initialPreviewHref, shareToken]);

  const handleChange = useCallback(
    (next: WireDiagram) => {
      setCurrent(next);
      void persist(next);
    },
    [persist]
  );

  return (
    <WireProvider diagram={current} onChange={handleChange}>
      <div className="fixed inset-0 flex flex-col bg-wire-page">
        <Header
          label={label}
          status={status}
          token={token}
          previewHref={previewHref}
          importHref={importHref}
          banner={banner}
        />
        <div className="relative min-h-0 flex-1">
          <div className="absolute left-4 top-4 z-10 grid w-[260px] gap-2">
            <WireToolbar className="rounded-md border border-wire bg-wire-surface p-2 shadow-wire-sm" />
            <WirePalette className="max-h-[420px] overflow-auto rounded-md border border-wire bg-wire-surface p-2 shadow-wire-sm" />
          </div>
          <div className="absolute right-4 top-4 z-10 w-[320px]">
            <WireValidationPanel className="rounded-md border border-wire bg-wire-surface p-[10px] shadow-wire-sm" />
          </div>
          <CanvasFrame>
            <WireCanvas
              mode="edit"
              fitView
              edgeRouting="smoothstep"
              showMiniMap
              showBackground={false}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", backgroundColor: "transparent" }}
            />
          </CanvasFrame>
        </div>
      </div>
    </WireProvider>
  );
}

function Header({
  label,
  status,
  token,
  previewHref,
  importHref,
  banner
}: {
  label: string;
  status: SaveStatus;
  token: string | null;
  previewHref: string | null;
  importHref: string | null;
  banner: string | null;
}) {
  return (
    <div className="grid shrink-0 gap-2 border-b border-wire bg-wire-surface px-4 py-3">
      <header className="flex items-center justify-between text-[13px] text-wire-primary">
        <div className="flex min-w-0 items-center gap-2">
          <a href="/" className="font-bold text-wire-primary no-underline">Wire Diagram</a>
          <span aria-hidden className="text-wire-muted">/</span>
          <span className="font-bold text-wire-primary">{label}</span>
          <span aria-hidden className="text-wire-muted">/</span>
          <span className="text-[12px] font-semibold text-wire-tertiary">edit</span>
          <StatusBadge status={status} token={token} />
        </div>
        <div className="flex items-center gap-2">
          {importHref ? (
            <a
              href={importHref}
              className="rounded-md bg-wire-primary px-3 py-1.5 text-[12px] font-bold text-white no-underline hover:opacity-90"
            >
              save to my workspace
            </a>
          ) : null}
          {previewHref ? (
            <a
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-wire bg-wire-surface px-3 py-1.5 text-[12px] font-bold text-wire-secondary no-underline hover:border-wire-strong hover:text-wire-primary"
            >
              preview
            </a>
          ) : null}
          <span className="text-[11px] font-semibold text-wire-tertiary">
            drag handles to connect, delete to remove
          </span>
        </div>
      </header>
      {banner ? (
        <div className="rounded-md bg-wire-status-reserved-bg px-3 py-2 text-[12px] font-bold text-wire-status-reserved">
          {banner}
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status, token }: { status: SaveStatus; token: string | null }) {
  if (status === "saving") {
    return <span className="ml-2 text-[12px] font-semibold text-wire-status-reserved">saving</span>;
  }
  if (status === "saved" && token) {
    return (
      <span className="ml-2 font-mono text-[12px] font-semibold text-wire-status-valid">
        saved {token}
      </span>
    );
  }
  if (status === "error") {
    return <span className="ml-2 text-[12px] font-semibold text-wire-status-invalid">save failed</span>;
  }
  return null;
}
