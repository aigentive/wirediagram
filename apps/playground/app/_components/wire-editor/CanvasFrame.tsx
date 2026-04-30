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
      className="relative min-h-0 flex-1 overflow-hidden"
      style={{
        backgroundColor: "var(--wire-canvas-bg)",
        backgroundImage:
          "radial-gradient(var(--wire-canvas-grid-major) 1.2px, transparent 1.2px), radial-gradient(var(--wire-canvas-grid-minor) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(241,245,249,0) 60%)",
        backgroundSize: "96px 96px, 24px 24px, 100% 100%",
        backgroundPosition: "0 0, 0 0, 0 0"
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 30% 30%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(ellipse at center, transparent 30%, rgba(15,23,42,0.08) 100%)"
        }}
      />
      {children}
      {topRight ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10 grid w-[min(320px,calc(100%-24px))] gap-2 [&>*]:pointer-events-auto">
          {topRight}
        </div>
      ) : null}
      {bottomLeft ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 [&>*]:pointer-events-auto">
          {bottomLeft}
        </div>
      ) : null}
      {bottomRight ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 [&>*]:pointer-events-auto">
          {bottomRight}
        </div>
      ) : null}
    </div>
  );
}
