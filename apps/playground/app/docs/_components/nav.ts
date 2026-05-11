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
