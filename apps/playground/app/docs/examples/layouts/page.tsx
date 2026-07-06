"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Braces,
  Download,
  Eye,
  GitBranch,
  Image as ImageIcon,
  Workflow,
  type LucideIcon
} from "lucide-react";
import { renderToSvg, toMermaid, type WireDiagram } from "@aigentive/wire-core";
import { WireCanvas, WireProvider } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { Prose } from "../../_components/Prose";
import {
  HORIZONTAL_DIAGRAM,
  OPTIONS,
  ROUTER_DIAGRAM,
  VERTICAL_DIAGRAM
} from "../_shared";

export default function LayoutsExamplePage() {
  return (
    <DocsPage
      eyebrow="Examples"
      title="Layouts"
      description="Same components, three layout directions. Pass the diagram and Wire takes care of routing, spacing, and edges."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Examples" }, { label: "Layouts" }]}
      next={{ href: "/docs/examples/click-modal", label: "Click → modal" }}
    >
      <Prose>
        <h2 id="three-shapes">Three shapes</h2>
        <p>
          The diagram object is the single source of truth. Switching <code>layout</code> from <code>LR</code> to{" "}
          <code>TB</code> reflows nodes and edges; nothing else changes. Use the toolbar on each card to switch between
          the live canvas, the static SVG render, the JSON source, and the Mermaid export.
        </p>
      </Prose>

      <div className="grid gap-5 lg:grid-cols-2">
        <LayoutCard
          title="Router"
          detail="One source, three sinks"
          code="layout: 'LR'"
          icon={GitBranch}
          diagram={ROUTER_DIAGRAM}
          canvasHeight={440}
        />
        <LayoutCard
          title="Vertical"
          detail="Top-to-bottom flow"
          code="layout: 'TB'"
          icon={ArrowDown}
          diagram={VERTICAL_DIAGRAM}
          canvasHeight={440}
        />
        <div className="lg:col-span-2">
          <LayoutCard
            title="Horizontal"
            detail="Left-to-right flow"
            code="layout: 'LR'"
            icon={ArrowRight}
            diagram={HORIZONTAL_DIAGRAM}
          />
        </div>
      </div>
    </DocsPage>
  );
}

function LayoutCard({
  title,
  detail,
  code,
  icon: Icon,
  diagram,
  canvasHeight = 300
}: {
  title: string;
  detail: string;
  code: string;
  icon: LucideIcon;
  diagram: WireDiagram;
  canvasHeight?: number;
}) {
  const [view, setView] = useState<CardView>("preview");
  const sourceJson = useMemo(() => JSON.stringify(diagram, null, 2), [diagram]);
  const sourceSvg = useMemo(() => renderToSvg(diagram), [diagram]);
  const sourceMermaid = useMemo(() => toMermaid(diagram), [diagram]);

  const baseName = diagram.id ?? "diagram";

  const handleDownload = () => {
    if (view === "preview" || view === "svg") {
      downloadBlob(`${baseName}.svg`, sourceSvg, "image/svg+xml");
    } else if (view === "json") {
      downloadBlob(`${baseName}.json`, sourceJson, "application/json");
    } else if (view === "mermaid") {
      downloadBlob(`${baseName}.mmd`, sourceMermaid, "text/plain");
    }
  };

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-wire bg-wire-surface p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] font-bold text-wire-primary">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-wire-sunken text-wire-secondary">
            <Icon size={14} aria-hidden strokeWidth={1.5} />
          </span>
          {title}
        </span>
        <code className="rounded bg-wire-sunken px-1.5 py-0.5 font-mono text-[11px] text-wire-secondary">
          {code}
        </code>
      </header>
      <p className="m-0 text-[12px] leading-5 text-wire-secondary">{detail}</p>
      <div className="overflow-hidden rounded-lg border border-wire bg-wire-sunken">
        <div className="flex items-center justify-between gap-2 border-b border-wire bg-wire-surface px-2 py-1.5">
          <ViewToggle view={view} onChange={setView} />
          <IconButton
            icon={Download}
            onClick={handleDownload}
            label={`Download ${downloadLabel(view)}`}
          />
        </div>
        <div className="relative" style={{ height: canvasHeight }}>
          {view === "preview" ? (
            <WireProvider defaultDiagram={diagram}>
              <WireCanvas
                mode="view"
                fitView
                fitViewPadding={0.08}
                showBackground={false}
                showControls
                showMiniMap={false}
                optionCatalog={OPTIONS}
              />
            </WireProvider>
          ) : view === "svg" ? (
            <SvgView svg={sourceSvg} />
          ) : view === "json" ? (
            <SourceView code={sourceJson} />
          ) : (
            <SourceView code={sourceMermaid} />
          )}
        </div>
      </div>
    </article>
  );
}

type CardView = "preview" | "svg" | "json" | "mermaid";

function downloadLabel(view: CardView): string {
  if (view === "preview" || view === "svg") return "SVG";
  if (view === "json") return "JSON";
  return "Mermaid";
}

function ViewToggle({ view, onChange }: { view: CardView; onChange: (next: CardView) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-wire-sunken p-0.5">
      <ToggleButton active={view === "preview"} onClick={() => onChange("preview")} icon={Eye} label="Preview" />
      <ToggleButton active={view === "svg"} onClick={() => onChange("svg")} icon={ImageIcon} label="SVG" />
      <ToggleButton active={view === "json"} onClick={() => onChange("json")} icon={Braces} label="JSON" />
      <ToggleButton active={view === "mermaid"} onClick={() => onChange("mermaid")} icon={Workflow} label="Mermaid" />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`View ${label.toLowerCase()}`}
      title={`View ${label.toLowerCase()}`}
      className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors duration-150 ${
        active
          ? "bg-wire-surface text-wire-primary shadow-wire-sm"
          : "text-wire-tertiary hover:text-wire-primary"
      }`}
    >
      <Icon size={11} aria-hidden strokeWidth={1.5} />
      {label}
    </button>
  );
}

function IconButton({
  icon: Icon,
  onClick,
  label
}: {
  icon: LucideIcon;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-md border border-wire bg-wire-surface text-wire-secondary transition-colors duration-150 hover:border-wire-strong hover:text-wire-primary"
    >
      <Icon size={13} aria-hidden strokeWidth={1.5} />
    </button>
  );
}

function SourceView({ code }: { code: string }) {
  return (
    <pre className="m-0 h-full overflow-auto p-3 font-mono text-[11px] leading-[1.6] text-wire-secondary">
      <code>{code}</code>
    </pre>
  );
}

function SvgView({ svg }: { svg: string }) {
  return (
    <div className="grid h-full place-items-center overflow-auto bg-wire-surface p-3 [&_svg]:max-h-full [&_svg]:max-w-full">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
