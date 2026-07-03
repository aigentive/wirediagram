"use client";

import { useState, type CSSProperties } from "react";
import { WireWorkspace } from "@aigentive/wire-react";
import { DocsPage } from "../../_components/DocsPage";
import { CodePreview } from "../../_components/CodePreview";
import { Prose, InlineCode } from "../../_components/Prose";
import { ExampleSurface, PRODUCTION_DIAGRAM, PRODUCTION_OPTIONS } from "../production-shared";

const THEME_SNIPPET = `import "@aigentive/wire-react/styles.css";
import { WireWorkspace } from "@aigentive/wire-react";

export function ThemedWorkspace({ diagram, onChange, optionCatalog }) {
  return (
    <WireWorkspace
      diagram={diagram}
      onChange={onChange}
      optionCatalog={optionCatalog}
      colorMode="system"
      classNames={{ root: "product-wire-workspace" }}
      style={{
        "--wire-border-focus": "#0f766e",
        "--wire-ring-focus": "0 0 0 2px rgba(15,118,110,0.26)"
      }}
    />
  );
}`;

type ExampleColorMode = "light" | "dark" | "system";

export default function ThemingExamplePage() {
  const [colorMode, setColorMode] = useState<ExampleColorMode>("system");

  return (
    <DocsPage
      eyebrow="Examples"
      title="Theming"
      description="Use colorMode, CSS variables, unstyled, and slot class names on current components."
      crumbs={[{ href: "/", label: "Docs" }, { label: "Examples" }, { label: "Theming" }]}
      next={{ href: "/examples/wrappers", label: "Wrappers" }}
    >
      <Prose>
        <h2 id="theme-contract">Theme contract</h2>
        <p>
          Package CSS supplies defaults. Hosts can set <InlineCode>colorMode</InlineCode>, override CSS variables,
          or use <InlineCode>unstyled</InlineCode> and <InlineCode>classNames</InlineCode> for full control.
        </p>
      </Prose>
      <div className="not-prose flex gap-1 rounded-md bg-wire-sunken p-1">
        {(["light", "dark", "system"] as ExampleColorMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={colorMode === mode}
            onClick={() => setColorMode(mode)}
            className="rounded px-2.5 py-1.5 text-[12px] font-bold capitalize text-wire-secondary aria-pressed:bg-wire-surface aria-pressed:text-wire-primary"
          >
            {mode}
          </button>
        ))}
      </div>
      <CodePreview
        snippet={THEME_SNIPPET}
        height={560}
        preview={
          <ExampleSurface height={560}>
            <WireWorkspace
              defaultDiagram={PRODUCTION_DIAGRAM}
              optionCatalog={PRODUCTION_OPTIONS}
              colorMode={colorMode}
              classNames={{ root: "product-wire-workspace" }}
              style={{
                "--wire-border-focus": "#0f766e",
                "--wire-ring-focus": "0 0 0 2px rgba(15,118,110,0.26)"
              } as CSSProperties}
              title="Themed router"
              subtitle="CSS variables and current slot names"
            />
          </ExampleSurface>
        }
      />
    </DocsPage>
  );
}
