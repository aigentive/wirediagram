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
      <div style={{ position: "fixed", inset: 0, background: "#f8fafc" }}>
        <Header
          label={label}
          status={status}
          token={token}
          previewHref={previewHref}
          importHref={importHref}
          banner={banner}
        />
        <div style={{ position: "absolute", top: banner ? 106 : 74, left: 16, zIndex: 10, display: "grid", gap: 8 }}>
          <WireToolbar
            style={{
              padding: 8,
              background: "rgba(255,255,255,0.94)",
              border: "1px solid #e2e8f0",
              borderRadius: 8
            }}
          />
          <WirePalette
            style={{
              width: 260,
              padding: 8,
              background: "rgba(255,255,255,0.94)",
              border: "1px solid #e2e8f0",
              borderRadius: 8
            }}
          />
        </div>
        <div style={{ position: "absolute", top: banner ? 106 : 74, right: 16, zIndex: 10, width: 320 }}>
          <WireValidationPanel
            style={{
              padding: 10,
              background: "rgba(255,255,255,0.94)",
              border: "1px solid #e2e8f0",
              borderRadius: 8
            }}
          />
        </div>
        <WireCanvas
          mode="edit"
          fitView
          showMiniMap
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 316,
            width: "auto",
            height: "100%"
          }}
        />
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
    <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 10 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontSize: 13,
          color: "#0f172a"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <a href="/" style={{ color: "#1e3a8a", textDecoration: "none", fontWeight: 600 }}>
            Wire
          </a>
          <span style={{ color: "#94a3b8" }}>/</span>
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span style={{ color: "#94a3b8" }}>/</span>
          <span style={{ color: "#475569", fontSize: 12 }}>edit</span>
          <StatusBadge status={status} token={token} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {importHref ? (
            <a
              href={importHref}
              style={{
                fontSize: 12,
                color: "white",
                background: "#020617",
                textDecoration: "none",
                fontWeight: 700,
                padding: "7px 12px",
                borderRadius: 6
              }}
            >
              save to my workspace
            </a>
          ) : null}
          {previewHref ? (
            <a
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 12,
                color: "#1e3a8a",
                textDecoration: "none",
                fontWeight: 600,
                padding: "6px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: 6
              }}
            >
              preview
            </a>
          ) : null}
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            drag handles to connect, delete to remove
          </span>
        </div>
      </header>
      {banner ? (
        <div
          style={{
            marginTop: 8,
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            background: "#eff6ff",
            color: "#1e3a8a",
            padding: "8px 12px",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            fontSize: 12,
            fontWeight: 700
          }}
        >
          {banner}
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status, token }: { status: SaveStatus; token: string | null }) {
  if (status === "saving") {
    return <span style={{ color: "#0284c7", fontSize: 12, marginLeft: 8 }}>saving</span>;
  }
  if (status === "saved" && token) {
    return (
      <span style={{ color: "#16a34a", fontSize: 12, marginLeft: 8, fontFamily: "ui-monospace, monospace" }}>
        saved {token}
      </span>
    );
  }
  if (status === "error") {
    return <span style={{ color: "#dc2626", fontSize: 12, marginLeft: 8 }}>save failed</span>;
  }
  return null;
}
