"use client";

import { useEffect, useState } from "react";

type Heading = { id: string; text: string };

export function PageToc() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();

  useEffect(() => {
    const collect = () => {
      const nodes = document.querySelectorAll<HTMLElement>("[data-toc-anchor='true'] h2[id], main h2[id]");
      const seen = new Set<string>();
      const list: Heading[] = [];
      nodes.forEach((node) => {
        if (!node.id || seen.has(node.id)) return;
        seen.add(node.id);
        list.push({ id: node.id, text: node.textContent?.trim() ?? node.id });
      });
      setHeadings(list);
    };

    collect();
    const observer = new MutationObserver(() => collect());
    observer.observe(document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;
    const scrollObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActiveId(visible[0]!.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 1] }
    );
    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) scrollObserver.observe(el);
    });
    return () => scrollObserver.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" className="grid content-start gap-2 py-8">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        On this page
      </span>
      <ul className="m-0 grid list-none gap-1 p-0">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id} className="m-0 p-0">
              <a
                href={`#${heading.id}`}
                className={`block rounded px-2 py-1 text-[12px] leading-5 no-underline ${
                  active
                    ? "bg-slate-100 font-bold text-slate-950 dark:bg-slate-800 dark:text-slate-50"
                    : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50"
                }`}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
