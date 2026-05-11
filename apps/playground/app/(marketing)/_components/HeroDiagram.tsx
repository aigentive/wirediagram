type NodeSpec = {
  id: string;
  x: number;
  y: number;
  title: string;
  kind: "trigger" | "ai" | "condition" | "action-success" | "action-warning";
};

type EdgeSpec = {
  from: string;
  to: string;
  label?: string;
};

const W = 130;
const H = 54;

const NODES: NodeSpec[] = [
  { id: "trigger", x: 16, y: 96, title: "Webhook fires", kind: "trigger" },
  { id: "ai", x: 184, y: 96, title: "Classify intent", kind: "ai" },
  { id: "route", x: 352, y: 96, title: "Route request", kind: "condition" },
  { id: "sales", x: 520, y: 24, title: "Notify sales", kind: "action-success" },
  { id: "ticket", x: 520, y: 168, title: "Open ticket", kind: "action-warning" }
];

const EDGES: EdgeSpec[] = [
  { from: "trigger", to: "ai" },
  { from: "ai", to: "route" },
  { from: "route", to: "sales", label: "sales" },
  { from: "route", to: "ticket", label: "support" }
];

const KIND_COLOR: Record<NodeSpec["kind"], { dot: string; eyebrow: string }> = {
  trigger: { dot: "var(--wire-kind-trigger)", eyebrow: "Trigger" },
  ai: { dot: "var(--wire-kind-ai)", eyebrow: "AI" },
  condition: { dot: "var(--wire-kind-condition)", eyebrow: "Condition" },
  "action-success": { dot: "var(--wire-kind-trigger)", eyebrow: "Action" },
  "action-warning": { dot: "var(--wire-kind-action)", eyebrow: "Action" }
};

function nodeById(id: string): NodeSpec {
  const n = NODES.find((x) => x.id === id);
  if (!n) throw new Error(`node ${id} missing`);
  return n;
}

function edgePath(e: EdgeSpec): { d: string; mid: { x: number; y: number } } {
  const from = nodeById(e.from);
  const to = nodeById(e.to);
  const x1 = from.x + W;
  const y1 = from.y + H / 2;
  const x2 = to.x;
  const y2 = to.y + H / 2;
  const mx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  return { d, mid: { x: mx, y: (y1 + y2) / 2 } };
}

export function HeroDiagram() {
  return (
    <div className="not-prose relative overflow-hidden rounded-xl border border-wire bg-wire-surface shadow-wire-sm">
      <div className="flex items-center justify-between border-b border-wire bg-wire-sunken px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-wire-status-valid" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-wire-tertiary">
            wire-diagram · agent-router.json
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <SurfacePill active>Canvas</SurfacePill>
          <SurfacePill>SVG</SurfacePill>
          <SurfacePill>Mermaid</SurfacePill>
        </div>
      </div>

      <div
        className="relative aspect-[680/300] w-full"
        style={{ backgroundColor: "var(--wire-canvas-bg)" }}
      >
        <DotGrid />

        <svg
          viewBox="0 0 680 300"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="A four-node wire diagram: a webhook trigger flows into an AI classify step, then a router branches into a sales action and a support-ticket action."
        >
          <defs>
            <marker
              id="hero-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--wire-fg-tertiary)" />
            </marker>
          </defs>

          {EDGES.map((e) => {
            const { d, mid } = edgePath(e);
            return (
              <g key={`${e.from}-${e.to}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="var(--wire-fg-tertiary)"
                  strokeWidth={1.5}
                  markerEnd="url(#hero-arrow)"
                />
                {e.label ? (
                  <g>
                    <rect
                      x={mid.x - 22}
                      y={mid.y - 9}
                      width={44}
                      height={18}
                      rx={4}
                      fill="var(--wire-bg-surface)"
                      stroke="var(--wire-border)"
                      strokeWidth={1}
                    />
                    <text
                      x={mid.x}
                      y={mid.y + 3}
                      textAnchor="middle"
                      fontFamily="var(--wire-font-mono)"
                      fontSize="9.5"
                      fill="var(--wire-fg-secondary)"
                    >
                      {e.label}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {NODES.map((n) => {
            const c = KIND_COLOR[n.kind];
            return (
              <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
                <rect
                  width={W}
                  height={H}
                  rx={8}
                  fill="var(--wire-bg-surface)"
                  stroke="var(--wire-border-strong)"
                  strokeWidth={1}
                />
                <rect
                  x={0.5}
                  y={0.5}
                  width={W - 1}
                  height={H - 1}
                  rx={7.5}
                  fill="none"
                  stroke="rgba(15, 23, 42, 0.04)"
                  strokeWidth={1}
                />
                <circle cx={14} cy={H / 2} r={4} fill={c.dot} />
                <text
                  x={26}
                  y={20}
                  fontFamily="var(--wire-font-sans)"
                  fontSize="8.5"
                  fontWeight="700"
                  letterSpacing="0.08em"
                  fill="var(--wire-fg-tertiary)"
                >
                  {c.eyebrow.toUpperCase()}
                </text>
                <text
                  x={26}
                  y={37}
                  fontFamily="var(--wire-font-sans)"
                  fontSize="12.5"
                  fontWeight="600"
                  fill="var(--wire-fg-primary)"
                >
                  {n.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function SurfacePill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`rounded px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.08em] ${
        active
          ? "bg-wire-primary text-wire-surface"
          : "text-wire-tertiary"
      }`}
    >
      {children}
    </span>
  );
}

function DotGrid() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern id="hero-dotgrid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--wire-grid-dot)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-dotgrid)" />
    </svg>
  );
}
