export type NavItem = {
  href: string;
  label: string;
  badge?: "new" | "soon";
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV: NavSection[] = [
  {
    title: "Get started",
    items: [
      { href: "/docs", label: "Introduction" },
      { href: "/docs/install", label: "Install & setup" },
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs/examples", label: "Examples" },
      { href: "/docs/production", label: "Production" }
    ]
  },
  {
    title: "Tooling",
    items: [
      { href: "/docs/mcp", label: "MCP server", badge: "new" },
      { href: "/docs/llm", label: "LLM docs", badge: "new" },
      { href: "/docs/cli", label: "CLI", badge: "new" }
    ]
  },
  {
    title: "Playground",
    items: [
      { href: "/playground", label: "Chat + canvas", badge: "new" }
    ]
  },
  {
    title: "Concepts",
    items: [{ href: "/docs/concepts", label: "Mental model" }]
  },
  {
    title: "Customize",
    items: [
      { href: "/docs/customize/cards", label: "Custom node cards" },
      { href: "/docs/customize/options", label: "Option catalogs", badge: "new" }
    ]
  },
  {
    title: "Listen",
    items: [
      { href: "/docs/listen", label: "Events surface" }
    ]
  },
  {
    title: "Examples",
    items: [
      { href: "/docs/examples", label: "Examples hub", badge: "new" },
      { href: "/docs/examples/package-css", label: "Package CSS" },
      { href: "/docs/examples/custom-shell", label: "Custom shell" },
      { href: "/docs/examples/options", label: "Options" },
      { href: "/docs/examples/controlled-state", label: "Controlled state" },
      { href: "/docs/examples/edge-inspection", label: "Edge inspection" },
      { href: "/docs/examples/accessibility", label: "Accessibility" },
      { href: "/docs/examples/theming", label: "Theming" },
      { href: "/docs/examples/wrappers", label: "Wrappers" },
      { href: "/docs/examples/read-only-inspector", label: "Read-only inspector" },
      { href: "/docs/examples/layouts", label: "Layouts" },
      { href: "/docs/examples/click-modal", label: "Click → modal" },
      { href: "/docs/examples/click-sidebar", label: "Click → sidebar" }
    ]
  },
  {
    title: "Reference",
    items: [
      { href: "/docs/api/react-components", label: "React components" },
      { href: "/docs/api/wire-core", label: "wire-core" },
      { href: "/docs/api/jsx-facade", label: "JSX facade" },
      { href: "/docs/api/hooks", label: "Hooks" }
    ]
  }
];
