"use client";

import { useEffect, type ReactElement } from "react";

export function PopupCompleteClient({ next }: { next: string }): ReactElement {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "wire:auth-complete", next }, window.location.origin);
      window.close();
      const fallback = window.setTimeout(() => {
        window.location.replace(next);
      }, 800);
      return () => window.clearTimeout(fallback);
    }

    window.location.replace(next);
    return undefined;
  }, [next]);

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 text-slate-950">
      <section className="grid w-full max-w-sm gap-2 rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="m-0 text-[18px] font-bold tracking-tight">Finishing sign in</h1>
        <p className="m-0 text-[13px] leading-5 text-slate-600">Returning to the playground.</p>
      </section>
    </main>
  );
}
