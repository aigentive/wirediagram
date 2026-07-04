import Link from "next/link";
import { Accessibility, Braces, Eye, MousePointerClick, Palette, PanelsTopLeft, Sliders, type LucideIcon } from "lucide-react";
import { DocsPage } from "../_components/DocsPage";
import { Prose, InlineCode } from "../_components/Prose";

export const metadata = { title: "Examples · Wire docs" };

const GROUPS: Array<{
  title: string;
  detail: string;
  items: Array<{ href: string; title: string; detail: string; icon: LucideIcon; apis: string[] }>;
}> = [
  {
    title: "First embed",
    detail: "Install, import package CSS, and render a stable surface.",
    items: [
      {
        href: "/docs/examples/package-css",
        title: "Package CSS",
        detail: "Verify the package stylesheet is enough for a packed consumer.",
        icon: Palette,
        apis: ["WireViewer", "styles.css"]
      },
      {
        href: "/docs/examples/wrappers",
        title: "Viewer and editor wrappers",
        detail: "Use the thin wrapper components for common embed cases.",
        icon: Eye,
        apis: ["WireViewer", "WireEditor"]
      },
      {
        href: "/docs/examples/layouts",
        title: "Layouts",
        detail: "Render the same nodes in multiple layout directions.",
        icon: PanelsTopLeft,
        apis: ["WireCanvas", "layout"]
      }
    ]
  },
  {
    title: "Product shell",
    detail: "Own state, persistence, and app-specific chrome around Wire.",
    items: [
      {
        href: "/docs/examples/custom-shell",
        title: "Custom shell",
        detail: "Compose provider, canvas, node list, and inspector yourself.",
        icon: Braces,
        apis: ["WireProvider", "WireCanvas", "WireInspector"]
      },
      {
        href: "/docs/examples/controlled-state",
        title: "Controlled state",
        detail: "Keep WireDiagram in app state and persist changes from onChange.",
        icon: Sliders,
        apis: ["WireWorkspace", "onChange"]
      },
      {
        href: "/docs/examples/read-only-inspector",
        title: "Read-only inspector",
        detail: "Pair a read-only diagram with inspection UI.",
        icon: Eye,
        apis: ["WireViewer", "WireInspector"]
      }
    ]
  },
  {
    title: "Configuration",
    detail: "Use options, inspection, and event handling without changing persisted contracts.",
    items: [
      {
        href: "/docs/examples/options",
        title: "Options",
        detail: "Render typed option controls from WireOptionCatalog.",
        icon: Sliders,
        apis: ["WireOptionCatalog", "WireOptionPanel"]
      },
      {
        href: "/docs/examples/edge-inspection",
        title: "Edge inspection",
        detail: "Inspect explicit edges with stable ids, labels, handles, and style.",
        icon: MousePointerClick,
        apis: ["WireEdge", "WireInspector"]
      },
      {
        href: "/docs/examples/click-modal",
        title: "Click modal",
        detail: "Open option controls from node events.",
        icon: MousePointerClick,
        apis: ["onEvent", "WireOptionPanel"]
      },
      {
        href: "/docs/examples/click-sidebar",
        title: "Click sidebar",
        detail: "Use event source labels to drive a persistent side panel.",
        icon: MousePointerClick,
        apis: ["onEvent", "WireOptionPanel"]
      }
    ]
  },
  {
    title: "Design integration",
    detail: "Adapt visuals and accessibility while keeping WireDiagram durable.",
    items: [
      {
        href: "/docs/examples/theming",
        title: "Theming",
        detail: "Use colorMode, classNames, and CSS variables.",
        icon: Palette,
        apis: ["colorMode", "classNames"]
      },
      {
        href: "/docs/examples/accessibility",
        title: "Accessibility",
        detail: "Keyboard and inspector behavior for repeated use.",
        icon: Accessibility,
        apis: ["keyboardA11y", "WireCanvas"]
      },
      {
        href: "/docs/customize/cards",
        title: "Custom node cards",
        detail: "Replace card rendering without changing durable data.",
        icon: Braces,
        apis: ["renderNode", "WireNodeCardView"]
      }
    ]
  }
];

export default function ExamplesPage() {
  return (
    <DocsPage
      eyebrow="Examples"
      title="Examples hub"
      description="A staged path from first embed to production shell, configuration, and design integration."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Examples" }]}
      next={{ href: "/docs/production", label: "Production guide" }}
    >
      <Prose>
        <h2 id="how-to-use">How to use these examples</h2>
        <p>
          Every example keeps <InlineCode>WireDiagram</InlineCode> as the durable state. Runtime UI such as viewport,
          selection, inspector state, option catalog functions, and React callbacks stay outside persisted JSON.
        </p>
      </Prose>

      <div className="grid gap-6">
        {GROUPS.map((group) => (
          <section key={group.title} className="grid gap-3">
            <div className="grid gap-1">
              <h2 id={slug(group.title)} className="m-0 text-[20px] font-bold text-wire-primary">
                {group.title}
              </h2>
              <p className="m-0 text-[14px] leading-6 text-wire-secondary">{group.detail}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group grid content-start gap-3 rounded-lg border border-wire bg-wire-surface p-4 no-underline shadow-wire-sm transition-colors duration-150 hover:border-wire-strong hover:bg-wire-sunken"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-[15px] font-bold text-wire-primary">
                        <Icon size={15} aria-hidden strokeWidth={1.5} className="text-wire-tertiary" />
                        {item.title}
                      </span>
                      <span aria-hidden className="text-[14px] font-bold text-wire-link transition-transform group-hover:translate-x-0.5">
                        {"->"}
                      </span>
                    </div>
                    <span className="text-[13px] leading-6 text-wire-secondary">{item.detail}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {item.apis.map((api) => (
                        <code key={api} className="rounded-sm border border-wire bg-wire-sunken px-1.5 py-0.5 text-[11px] text-wire-secondary">
                          {api}
                        </code>
                      ))}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Prose>
        <h2 id="coverage">Coverage</h2>
        <p>
          The examples manifest maps every routed example and root JSON example to its stage, route, APIs, expected
          validation warnings, render modes, LLM exposure, and snippet source. Release checks should fail when a route
          or file drifts from that manifest.
        </p>
      </Prose>
    </DocsPage>
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
