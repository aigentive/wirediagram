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
    <div className="fixed inset-0 overflow-hidden bg-wire-page font-sans">
      <header className="absolute left-3 right-3 top-3 z-10 flex items-center justify-between rounded-lg border border-wire bg-wire-surface px-4 py-2.5 text-[13px] text-wire-primary">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="font-semibold text-wire-primary no-underline hover:text-wire-secondary">
            Wire
          </Link>
          <span className="text-wire-muted">/</span>
          <span className="font-semibold">{label}</span>
          <span className="text-wire-muted">/</span>
          <span className="text-[12px] text-wire-secondary">preview</span>
        </div>
        {editHref ? (
          <Link
            href={editHref}
            className="rounded-md border border-wire bg-wire-surface px-3 py-1.5 text-[12px] font-semibold text-wire-primary no-underline hover:border-wire-strong"
          >
            edit
          </Link>
        ) : null}
      </header>
      <div className="absolute bottom-6 left-6 right-6 top-[70px] flex items-center justify-center overflow-hidden rounded-lg border border-wire bg-wire-surface p-6">
        <div
          style={{ width: "100%", height: "100%" }}
          dangerouslySetInnerHTML={{ __html: responsiveSvg }}
        />
      </div>
    </div>
  );
}
