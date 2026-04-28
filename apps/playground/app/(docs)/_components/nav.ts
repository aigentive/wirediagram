import {
  BookOpen,
  Boxes,
  Bot,
  Lightbulb,
  Radio,
  Rocket,
  Sliders,
  Wrench,
  type LucideIcon
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  badge?: "new" | "soon";
};

export type NavSection = {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
};

export const NAV: NavSection[] = [
  {
    title: "Get started",
    icon: Rocket,
    items: [
      { href: "/", label: "Introduction" },
      { href: "/install", label: "Install & setup" },
      { href: "/quickstart", label: "Quickstart" }
    ]
  },
  {
    title: "Playground",
    icon: Bot,
    items: [
      { href: "/playground", label: "Chat + canvas", badge: "new" }
    ]
  },
  {
    title: "Concepts",
    icon: Lightbulb,
    items: [{ href: "/concepts", label: "Mental model" }]
  },
  {
    title: "Customize",
    icon: Sliders,
    items: [
      { href: "/customize/cards", label: "Custom node cards" },
      { href: "/customize/list-rows", label: "Custom list rows", badge: "soon" },
      { href: "/customize/theme", label: "Theme & dark mode", badge: "soon" }
    ]
  },
  {
    title: "Listen",
    icon: Radio,
    items: [
      { href: "/listen", label: "Events surface" }
    ]
  },
  {
    title: "Examples",
    icon: Boxes,
    items: [
      { href: "/examples/layouts", label: "Layouts" },
      { href: "/examples/click-modal", label: "Click → modal" },
      { href: "/examples/click-sidebar", label: "Click → sidebar" }
    ]
  },
  {
    title: "Tooling",
    icon: Wrench,
    items: [
      { href: "/mcp", label: "MCP server", badge: "new" },
      { href: "/cli", label: "CLI", badge: "new" }
    ]
  },
  {
    title: "Reference",
    icon: BookOpen,
    items: [
      { href: "/api/wire-core", label: "wire-core", badge: "new" },
      { href: "/api/jsx-facade", label: "JSX facade", badge: "new" },
      { href: "/api/hooks", label: "Hooks", badge: "new" }
    ]
  }
];
