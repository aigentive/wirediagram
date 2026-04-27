import Link from "next/link";

interface PreviewCanvasProps {
  svg: string;
  label: string;
  /** Optional pointer to the editable variant. */
  editHref?: string;
}

export function PreviewCanvas({ svg, label, editHref }: PreviewCanvasProps) {
  // Strip the renderer's hard-coded width/height so the SVG scales to
  // fill its container instead of overflowing.
  const responsiveSvg = svg.replace(
    /<svg([^>]*?)\s+width="[^"]+"\s+height="[^"]+"/,
    '<svg$1 style="width:100%;height:100%;display:block"'
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f8fafc",
        overflow: "hidden",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      }}
    >
      <header
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          fontSize: 13,
          color: "#0f172a"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Link href="/" style={{ color: "#1e3a8a", textDecoration: "none", fontWeight: 600 }}>
            ← Wire
          </Link>
          <span style={{ color: "#94a3b8" }}>/</span>
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span style={{ color: "#94a3b8" }}>·</span>
          <span style={{ color: "#475569", fontSize: 12 }}>preview</span>
        </div>
        {editHref ? (
          <Link
            href={editHref}
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
            edit ↗
          </Link>
        ) : null}
      </header>
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 24,
          right: 24,
          bottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          overflow: "hidden",
          padding: 24
        }}
      >
        <div
          style={{ width: "100%", height: "100%" }}
          dangerouslySetInnerHTML={{ __html: responsiveSvg }}
        />
      </div>
    </div>
  );
}
