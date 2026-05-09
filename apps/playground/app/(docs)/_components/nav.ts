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
      { href: "/", label: "Introduction" },
      { href: "/install", label: "Install & setup" },
      { href: "/quickstart", label: "Quickstart" }
    ]
  },
  {
    title: "Tooling",
    items: [
      { href: "/mcp", label: "MCP server", badge: "new" },
      { href: "/llm", label: "LLM docs", badge: "new" },
      { href: "/cli", label: "CLI", badge: "new" }
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
    items: [{ href: "/concepts", label: "Mental model" }]
  },
  {
    title: "Customize",
    items: [
      { href: "/customize/cards", label: "Custom node cards" },
      { href: "/customize/list-rows", label: "Custom list rows", badge: "soon" },
      { href: "/customize/theme", label: "Theme & dark mode", badge: "soon" }
    ]
  },
  {
    title: "Listen",
    items: [
      { href: "/listen", label: "Events surface" }
    ]
  },
  {
    title: "Examples",
    items: [
      { href: "/examples/layouts", label: "Layouts" },
      { href: "/examples/click-modal", label: "Click → modal" },
      { href: "/examples/click-sidebar", label: "Click → sidebar" }
    ]
  },
  {
    title: "Reference",
    items: [
      { href: "/api/wire-core", label: "wire-core", badge: "new" },
      { href: "/api/jsx-facade", label: "JSX facade", badge: "new" },
      { href: "/api/hooks", label: "Hooks", badge: "new" }
    ]
  }
];
