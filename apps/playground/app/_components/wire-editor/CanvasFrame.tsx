import type { ReactNode } from "react";

export function CanvasFrame({
  topRight,
  bottomLeft,
  bottomRight,
  children
}: {
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden bg-wire-canvas"
      style={{
        backgroundImage:
          "radial-gradient(var(--wire-grid-dot) 1px, transparent 1px)",
        backgroundSize: "16px 16px"
      }}
    >
      {children}
      {topRight ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10 grid w-[min(320px,calc(100%-24px))] gap-2">
          <div className="pointer-events-auto grid gap-2">{topRight}</div>
        </div>
      ) : null}
      {bottomLeft ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10">
          <div className="pointer-events-auto">{bottomLeft}</div>
        </div>
      ) : null}
      {bottomRight ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10">
          <div className="pointer-events-auto">{bottomRight}</div>
        </div>
      ) : null}
    </div>
  );
}
