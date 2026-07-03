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
      { href: "/docs/quickstart", label: "Quickstart" }
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
      { href: "/docs/customize/list-rows", label: "Custom list rows", badge: "soon" },
      { href: "/docs/customize/theme", label: "Theme & dark mode", badge: "soon" }
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
      { href: "/docs/examples/package-css", label: "Package CSS", badge: "new" },
      { href: "/docs/examples/custom-shell", label: "Custom shell", badge: "new" },
      { href: "/docs/examples/options", label: "Options", badge: "new" },
      { href: "/docs/examples/controlled-state", label: "Controlled state", badge: "new" },
      { href: "/docs/examples/edge-inspection", label: "Edge inspection", badge: "new" },
      { href: "/docs/examples/accessibility", label: "Accessibility", badge: "new" },
      { href: "/docs/examples/theming", label: "Theming", badge: "new" },
      { href: "/docs/examples/wrappers", label: "Wrappers", badge: "new" },
      { href: "/docs/examples/read-only-inspector", label: "Read-only inspector", badge: "new" },
      { href: "/docs/examples/layouts", label: "Layouts" },
      { href: "/docs/examples/click-modal", label: "Click → modal" },
      { href: "/docs/examples/click-sidebar", label: "Click → sidebar" }
    ]
  },
  {
    title: "Reference",
    items: [
      { href: "/docs/api/wire-core", label: "wire-core", badge: "new" },
      { href: "/docs/api/jsx-facade", label: "JSX facade", badge: "new" },
      { href: "/docs/api/hooks", label: "Hooks", badge: "new" }
    ]
  }
];
