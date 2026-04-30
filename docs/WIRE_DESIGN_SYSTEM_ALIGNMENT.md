# Wire Design System Alignment — Phased Plan

> Bring `/wire` (`/(docs)/*`) and `/playground` (and the authenticated `/wires` editor) in line with the canonical Wire Design System bundled at `/Users/admin/Downloads/Wire Design System`.

The design system is the source of truth. It defines every token (color, type, radii, shadow), the rail/sidebar/canvas chrome, the chat-bubble accent, the kind-chip palette, and a long list of explicit anti-patterns ("no colored left-border stripes", "no backdrop-blur", "no gradients", "radius ≤ 8px"). This plan turns those rules into a concrete, ordered sequence of edits.

User scope (from the request):
- `/wire` (the docs surface — currently `app/(docs)/*`) and `/playground` (the unauthenticated chat + canvas surface) are in scope.
- The authenticated **user sidebar** in `/playground` is **out of scope** (do not restyle the "Authenticated / New Wire / Search wires…" column in `PlaygroundClient`).
- The authenticated `/wires` editor shares almost every primitive with `/playground` — its rails, chat, header pills, and canvas chrome must follow the same Phase 1–4 changes (the screenshots labelled "Estimate Follow-up Workflow" come from this surface).

---

## Source-of-truth references

| Reference | Location |
|---|---|
| Canonical tokens | `Wire Design System/colors_and_type.css` |
| Voice / visual rules | `Wire Design System/README.md` |
| Skill manifest (non-negotiables) | `Wire Design System/SKILL.md` |
| Reference Shell (header + tabs) | `Wire Design System/ui_kits/playground/Shell.jsx` |
| Reference primitives (KindChip, NodeCard, GroupFrame, CodeBlock, Eyebrow…) | `Wire Design System/ui_kits/playground/WireBits.jsx` |
| Reference editor shell (sidebar + canvas + inspector) | `Wire Design System/ui_kits/playground/WorkspaceTab.jsx` |
| Specimen previews per token group | `Wire Design System/preview/*.html` |
| Visual ground truth (current product captures) | `Wire Design System/uploads/*.png` — especially `Screenshot 2026-04-30 at 09.15.44.png` (canvas), `Screenshot 2026-04-30 at 10.15.31.png` (full editor), `Screenshot 2026-04-30 at 09.19.57.png` (dark nav + tool rail), `Screenshot 2026-04-27 at 17.15.22.png` (chat panel) |

---

## Audit summary — what's wrong today

**Tokens / fonts**
- `app/globals.css` sets only `ui-sans-serif`. DS requires **Inter** body + **JetBrains Mono** mono, both already shipped in `Wire Design System/fonts/`.
- No CSS variables exist for the Wire palette, status palette, or rail/nav/canvas tokens. Components hardcode Tailwind slate/blue/emerald classes throughout, so dark mode and theme drift are uncontrolled.

**`/wire` docs (`app/(docs)/_components/*`)**
- `TopHeader` uses `bg-white/90 backdrop-blur` — DS forbids glassmorphism.
- Brand mark on light bg uses `bg-slate-950` square; DS pairs the mark with a `slate-700`-tinted square inside a dark surface. (See `Screenshot 2026-04-30 at 10.07.49.png`.)
- `Sidebar` left rail uses pure `bg-white`. DS pattern for the editor is a **dark navy nav** (`--wire-nav-bg`); for docs the rail can stay light, but spacing, eyebrow tracking, and active-state styles need DS tokens.
- Landing path cards use `rounded-xl` (12px). DS caps radius at **8px** (`rounded-lg`).
- Eyebrow text currently mixes `tracking-wider` and `text-[11px] font-extrabold`. DS spec is `font-semibold` (`600`), `tracking: 0.08em`, `text-[11px]`, `text-blue-600` for blue eyebrows.
- "soon" / "new" badges use `text-[9px] font-extrabold uppercase tracking-wider` — close, but they need the DS status palette tokens, not raw `bg-blue-100`.

**`/playground` (`app/playground/PlaygroundClient.tsx`) and `/wires` (`app/wires/WiresClient.tsx`)**
- Chat **assistant bubble** = `border-slate-200 bg-slate-50`, **user bubble** = solid `bg-blue-600`. DS user bubble is a near-flat blue (`--wire-chat-user-from` → `--wire-chat-user-to`) with a `0 1px 2px rgba(37,99,235,0.16)` blue-tinted shadow; the eyebrow uses a tiny round dot, not a Lucide icon.
- Chat bubble role label uses `<Bot/>` and `<MessageSquare/>` icons inline; DS shows a 6px filled `•` followed by `USER` / `ASSISTANT` eyebrow text.
- Header pill **`StatusPill`** uses `bg-emerald-50 text-emerald-700`/`bg-amber-50 text-amber-700` — close to DS status tokens but they are hardcoded and not centralized.
- `/playground` and `/wires` headers use `bg-slate-950` (`Wrench` icon) for the Wire mark. The captures (`10.07.49`, `10.11.41`) show the brand mark as a dark navy tile with the Wire-glyph in a soft blue, *inside* a dark-navy nav bar — not a stand-alone black square.
- The **tools sidebar** ("ADD NODE" with `Trigger / AI / Tool / Action / Condition / Human / Retrieval` rows and right-aligned single-letter shortcut chips) is **not present** on `/playground`. On `/wires` (`WiresClient.tsx`) the equivalent is `WirePalette`, but it is rendered as an absolute-positioned floating panel inside the canvas instead of a dedicated rail column.
- Active wires sidebar uses `bg-white` with `bg-slate-100` active row. DS shows that column rendered on the **dark `--wire-nav-bg`** surface with `rgba(255,255,255,0.08)` for the active item and a 2px `--wire-nav-accent` (blue-400) left bar. The user has explicitly excluded this for `/playground`, but the `/wires` route should follow it.
- Validation panel, inspector, palette, and toolbar are styled with inline `style={{ background: "rgba(255,255,255,0.96)", border: "1px solid #e2e8f0", borderRadius: 8 }}` literals — should consume tokens.
- `WireToolbar` and `WirePalette` panels read from `#e2e8f0` directly; needs `var(--wire-border)`.
- Canvas BG is React Flow's default. DS canvas BG is `--wire-canvas-bg` with a 16px dot-grid using `--wire-grid-dot` at `~0.20` opacity — light mode shows the soft grid; the captures confirm it.
- `connect local MCP`, `Saved`, `Share` chips in `WiresClient` header use ad-hoc `border-slate-200 bg-emerald-50` etc. DS shows them as **status pills** with a tiny dot prefix matching the `--wire-status-*` palette.
- Avatar in DS: 28px filled `slate-950` circle with two-letter initials in white. Current `/wires` avatar uses `<UserCheck>` icon in an emerald badge.
- Chat composer **submit** button uses `bg-blue-600`. DS keeps blue but rounds at **6px** and omits hover scale; current matches but the button group should pull tokens.
- The whole shell uses `font-extrabold` (weight 800) freely; DS only uses 400/500/600/700 — `font-bold` (700) is the heaviest, never `font-extrabold`.

---

## Phase 0 — Token foundation (must land first)

**Goal:** every subsequent phase consumes tokens, not raw Tailwind hex.

**Scope**
- Copy `Wire Design System/colors_and_type.css` content into `apps/playground/app/globals.css` (or import a sibling `wire-tokens.css`). Keep the `:root` and `.dark` blocks verbatim — these names are referenced across the design system.
- Bundle the two webfont files. Recommended: copy `Inter-Variable.woff2` and `JetBrainsMono-Variable.woff2` to `apps/playground/public/fonts/`, and rewrite the `@font-face src` paths to `/fonts/...`. Do **not** swap to Next `next/font` yet — keep parity with the DS file in case it gets shared elsewhere.
- Wire the body to `--wire-font-sans` and remove the `ui-sans-serif` fallback string from `globals.css`.
- Map Tailwind theme colors to the CSS variables so existing `bg-slate-50`, `text-slate-950`, etc. continue to work *and* dark-mode flips through `<html class="dark">` use DS values:
  ```css
  @theme inline {
    --color-slate-50: var(--wire-slate-50);
    --color-slate-100: var(--wire-slate-100);
    /* … through 950 */
    --color-blue-50: var(--wire-blue-50);
    --color-blue-500: var(--wire-blue-500);
    --color-blue-600: var(--wire-blue-600);
    --color-blue-700: var(--wire-blue-700);
  }
  ```
- Add semantic Tailwind utilities for the surfaces we hit most:
  - `bg-wire-page`, `bg-wire-surface`, `bg-wire-sunken`, `bg-wire-canvas`, `bg-wire-rail`, `bg-wire-nav`, `bg-wire-code`
  - `text-wire-primary` / `secondary` / `tertiary` / `muted`
  - `border-wire`, `border-wire-strong`, `ring-wire-focus`
  - `shadow-wire-sm` (the only shadow), `shadow-wire-md`
- Set the body globally: `bg-wire-page text-wire-primary font-sans antialiased`. Drop the legacy `bg-slate-50 dark:bg-slate-950` in `app/globals.css`.

**Files touched**
- `apps/playground/app/globals.css`
- `apps/playground/public/fonts/Inter-Variable.woff2`, `JetBrainsMono-Variable.woff2` (new)
- `apps/playground/app/layout.tsx` (only if a `<link rel="preload">` is added for the fonts)

**Acceptance**
- Page background and body type visibly switch to Inter; mono inline code switches to JetBrains Mono.
- Toggling `.dark` on `<html>` flips every background/foreground via the variable cascade — no hardcoded hex remains in `globals.css`.
- `npm run build -w @aigentive/wire-react` and the playground build still pass; no Tailwind class regressions.

**Risks**
- Font URLs need to resolve in production (Vercel) — verify `public/fonts/` is deployed.
- React Flow's CSS uses its own selectors; if any of them clash with `.dark`, scope overrides via `.dark .react-flow__pane { background: var(--wire-canvas-bg); }`.

---

## Phase 1 — Docs shell (`/wire`, `/(docs)/*`)

**Goal:** the docs landing and every routed page (`/install`, `/concepts`, `/mcp`, `/cli`, `/llm`, `/api/*`, etc.) inherit DS chrome.

**Scope**
- `app/(docs)/_components/TopHeader.tsx`
  - Drop `bg-white/90 backdrop-blur`. Use solid `bg-wire-page` (or `bg-wire-surface` if we want the header to read as a panel) with `border-b border-wire`.
  - Brand link: keep `Wire` wordmark (`text-[15px] font-bold`) but follow the DS by adding the small grey `v1.x` tag to the right (`text-[11px] font-mono text-wire-tertiary`, see `Screenshot 2026-04-30 at 10.07.49.png`).
  - Replace the small `BrandMark` `bg-slate-950` square with the DS pattern: a 28×28 `bg-slate-800` (=`--wire-nav-bg`) tile with a 14px Wire glyph in `text-blue-400`. Keep the SVG path; only the colors change.
  - Replace the `Playground` button (currently `bg-blue-600`) with the DS pill: small rounded-md `bg-wire-surface border border-wire text-wire-primary` link, **not** primary blue. The single brand-blue surface is reserved for the eyebrow text and the focus ring.
  - Replace the `Sun`/`Moon` icon button with the **LIGHT / DARK pill toggle** from `Shell.jsx` (the only `rounded-full` element allowed in core UI). Use the exact spec: 1px slate border, two `text-[11px] font-bold uppercase tracking-[0.08em]` segments, the active half filled `slate-900` / white text.
  - GitHub link unchanged but route through the same border/text tokens.
- `app/(docs)/_components/Sidebar.tsx`
  - Section eyebrow: replace the icon-prefixed `text-[11px] font-extrabold tracking-wider` with `wire-eyebrow wire-eyebrow--muted`. Drop the section icons (DS sidebars have no per-section icons; eyebrows do the chunking).
  - Active item: use `bg-wire-sunken text-wire-primary font-semibold` (no `font-bold`); add a 2px `--wire-blue-500` left bar via `border-l-2 -ml-px` only on `active`. Keep radius 6px, never 8.
  - Hover: `hover:bg-wire-sunken hover:text-wire-primary` only.
  - "soon" and "new" badges: refactor into a single `<Badge variant="reserved" | "valid">` component reading the status palette tokens (`--wire-status-reserved-bg` etc.). Drop `font-extrabold` → `font-bold`.
- `app/(docs)/page.tsx` (landing) and `app/(docs)/_components/DocsPage.tsx`
  - Path cards: `rounded-xl` → `rounded-lg`. Drop the colored `bg-blue-50` icon tile; DS keeps icon backgrounds neutral (`bg-wire-sunken`) with `text-wire-primary`. Eyebrow stays `text-blue-600` per DS rule that brand-blue is the eyebrow color.
  - "Read →" footer arrow: switch to literal `→` character (DS spec) instead of the `ArrowRight` Lucide; keep blue color.
  - Highlight task cards: same `rounded-lg`, drop `font-extrabold` to `font-bold`.
- `app/(docs)/_components/Prose.tsx`, `CodeBlock.tsx`, `PropsTable.tsx`, `Callout.tsx`
  - Code block bg: `bg-wire-code` (the deeper `slate-950`-with-indigo `--wire-bg-code`). Mono = JetBrains Mono via tokens.
  - Prose tables: 44px row height, 12px h-padding, 1px `border-wire` hairlines, no zebra stripes.
  - Callout: drop any colored left-border stripe pattern (the user's CLAUDE.md and DS both forbid this).

**Files touched**
- `apps/playground/app/(docs)/_components/{TopHeader,Sidebar,DocsShell,DocsPage,Prose,CodeBlock,Callout,PropsTable,PageToc,nav}.tsx`
- `apps/playground/app/(docs)/page.tsx`
- `apps/playground/app/_components/GithubRepoLink.tsx` (only border/text tokens)

**Acceptance**
- `/`, `/install`, `/quickstart`, `/concepts`, `/mcp`, `/llm`, `/cli`, `/api/*`, `/customize/*`, `/listen`, `/examples/*`, `/contact` all share the same chrome and look indistinguishable from the DS Shell screenshots in light mode.
- Manual diff against `Wire Design System/uploads/Screenshot 2026-04-27 at 17.12.38.png` (Overview tab): brand row, eyebrow color, tab styling, body type all match.
- LIGHT/DARK toggle works without flicker; no `backdrop-blur` rules remain anywhere in `(docs)`.

**Risks**
- The docs landing currently uses `<Link>` cards with hover state changes; switching to neutral icons may dull the discoverability cue — compensate by keeping the blue eyebrow + the `→` arrow in blue.

---

## Phase 2 — Playground & Wires header / chat / status pills

**Goal:** the unauthenticated `/playground` and the authenticated `/wires` editor share a single set of header chrome, status pills, and chat primitives that match the DS captures.

**Scope (shared)**
- Extract a `<EditorHeader>` (or `WireAppBar`) component used by both `PlaygroundClient.tsx` and `WiresClient.tsx`. Layout from left to right:
  1. **Brand block** — the dark-navy 28×28 brand tile + `Wire` wordmark + `v1.4` mono-grey tag (per `10.07.49.png`).
  2. **Breadcrumb** — `Wires / <Title>` rendered as `text-wire-tertiary` slash-separated; current title uses `text-wire-primary font-bold`.
  3. **Status group (right side)** — `Saved` (green dot + label), `Share` (paperplane icon, neutral pill), `Connect local MCP` (slate dot + label), avatar + name + `Sign out`. Each pill is a `inline-flex h-8 rounded-md border border-wire bg-wire-surface px-2.5` shell with a `text-[12px] font-semibold` label and an optional 6px filled dot in the matching status color.
- Build `<StatusPill>` and `<DotPill>` primitives in `apps/playground/app/_components/` consuming `--wire-status-*` tokens. Replace every inline emerald/amber/blue pill in `PlaygroundClient.tsx` (`StatusPill`, `CostPill`, the `UserCheck` "Authenticated" pill) and `WiresClient.tsx` (`Saved`, `Connect local MCP`, etc.).
- Build `<Avatar initials="AD" />` (28px `bg-slate-950` filled circle, white tabular initials) and use it in both apps.

**Scope (chat)**
- New `<ChatBubble>` and `<ChatComposer>` primitives in `apps/playground/app/_components/chat/`:
  - **Assistant bubble**: `bg-wire-surface border border-wire rounded-md p-3 text-[13px] leading-5 text-wire-secondary`. Top eyebrow row = small filled `bg-wire-fg-muted` 6px dot + `ASSISTANT` label (`wire-eyebrow wire-eyebrow--muted`).
  - **User bubble**: `bg-[var(--wire-chat-user-from)] text-white shadow-[var(--wire-chat-user-shadow)] rounded-md p-3 text-[13px]`. Eyebrow = small dot + `YOU` label, both `text-white/80`.
  - Both bubbles are full-width with a small `mr-5` / `ml-5` margin to keep alignment readable; never use chat tails or rounded-full bubbles.
  - The composer textarea is `border border-wire rounded-md` with `focus:border-wire-focus`. Submit button is a 40px `rounded-md bg-wire-blue-600` square with the `Send` Lucide at `1.5px stroke`.
  - Footer line under the composer (per `Screenshot 2026-04-27 at 17.15.22.png`): `Wire MCP` label, `local` chip, `· gpt-4.1` mono text, `↵ send · ⇧↵ newline` keyboard hints. Render with the eyebrow class and `wire-code` for the chips.
- Replace `ChatBubble` in `PlaygroundClient.tsx` (lines ~712–732) and the duplicate in `WiresClient.tsx` with the new component.
- The `CostLine` rendered inside an assistant bubble stays, but uses `border-t border-wire` and `text-wire-tertiary text-[11px]`. Strip `font-extrabold`.

**Scope (segmented + reset buttons)**
- `SegmentedButton` (the `Canvas / JSON / SVG / Mermaid` switch in both files) becomes a single `<TabSegment>` primitive. Active = `bg-wire-primary text-white rounded-md font-bold`; inactive = `bg-wire-surface border border-wire text-wire-secondary`. Drop `font-extrabold`.
- The `Reset` button on the right of the canvas mode bar becomes an icon-prefixed neutral pill matching the rest of the header pills.

**Files touched**
- `apps/playground/app/_components/{EditorHeader,StatusPill,DotPill,Avatar,Brandmark}.tsx` (new)
- `apps/playground/app/_components/chat/{ChatBubble,ChatComposer,ChatRoleLabel}.tsx` (new)
- `apps/playground/app/playground/PlaygroundClient.tsx` (replace header + chat sections)
- `apps/playground/app/wires/WiresClient.tsx` (same)
- Out of scope per user: the `AuthenticatedWireSidebar` block in `PlaygroundClient.tsx` — leave its visual treatment unchanged.

**Acceptance**
- Side-by-side with `Screenshot 2026-04-30 at 10.11.41.png` (header pills) and `Screenshot 2026-04-27 at 17.15.22.png` (chat panel): the header order, pill styling, dot colors, brand mark, avatar, and chat bubble shapes all match.
- No `bg-blue-600` user bubble remains; the user bubble uses `--wire-chat-user-from` and the blue-tinted shadow.
- No `font-extrabold` references remain in `PlaygroundClient.tsx` or `WiresClient.tsx`.
- Playground and Wires share a single header component instance.

**Risks**
- `WiresClient.tsx` is ~1400 lines and densely coupled; refactor in two passes — first extract the components, then swap call sites — to keep diffs reviewable.
- `CostPill` displays a tooltip via `title=`; ensure the new pill primitive supports passing `title`.

---

## Phase 3 — Editor canvas + tool rail + dark nav (`/wires`)

**Goal:** the `/wires` editor matches the captures `Screenshot 2026-04-29 at 23.53.26.png` and `Screenshot 2026-04-30 at 09.19.57.png`: a **dark navy left nav** holding "ACTIVE WIRES" + "+ New Wire" + search, a **light tool rail** column ("ADD NODE" with kind chips and keyboard hints), then the **canvas paper** with dot grid.

**Scope (dark nav rail — left column)**
- Wrap the `/wires` left column (`bg-white border-r` today) in `bg-wire-nav text-wire-nav-fg`.
- "+ New Wire" button: `bg-white text-slate-950 rounded-md font-bold` (per the screenshot — it inverts inside the dark rail). Use the dark-on-white treatment from the `Estimate Follow-up Workflow` capture.
- Search input: `bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-wire-nav-fg placeholder:text-wire-nav-fg-dim`.
- Section header `ACTIVE WIRES`: `wire-eyebrow` rendered in `text-wire-nav-fg-muted`.
- Wire row (active): `bg-wire-nav-bg-active rounded-md` with a 2px `--wire-nav-accent` left bar (`border-l-2 border-[var(--wire-nav-accent)]`). The active wire title is `text-white font-bold`; meta line (`10 nodes · edited 2m ago`) is `text-wire-nav-fg-muted text-[12px]`.
- Wire row (inactive): `text-wire-nav-fg hover:bg-wire-nav-bg-hover`.
- Sign out button at bottom: ghost dark style, `text-wire-nav-fg-muted` with the `LogOut` Lucide.

**Scope (tool rail — second column, "ADD NODE")**
- Today `WirePalette` is a floating absolute panel inside the canvas. Promote it to a **dedicated 220px column** between the dark nav and the canvas, with `bg-wire-rail border-r border-wire`.
- Column header strip (top of rail): a small toolbar with `View` button (eye icon) and undo/redo arrows. Match the capture: light buttons, slate borders, `rounded-md` 6px.
- Section eyebrow `ADD NODE` follows `wire-eyebrow wire-eyebrow--muted` styling.
- Each kind row: `bg-wire-surface border border-wire rounded-md flex h-9 items-center gap-2 px-3` with:
  - 16px Lucide icon in the kind hue (`Trigger` = play emerald, `AI` = sparkle blue, `Tool` = leaf teal, `Action` = arrow orange, `Condition` = help fuchsia, `Human` = person slate, `Retrieval` = database indigo).
  - Label `text-[13px] font-semibold text-wire-primary`.
  - Right-side keyboard hint: a single-letter `wire-code` chip (`T`, `A`, `L`, `N`, `C`, `H`, `R`).
- Wire keyboard shortcuts to insert the corresponding node (already partially scaffolded via `WirePalette`).
- Drop the `WirePalette` floating-panel rendering inside the canvas — the canvas keeps only the validation/inspector overlay on the right and the +/− zoom controls bottom-left.

**Scope (canvas paper)**
- Set the canvas wrapper to `bg-wire-canvas` and inject the dot grid as a CSS background:
  ```css
  background-image: radial-gradient(var(--wire-grid-dot) 1px, transparent 1px);
  background-size: 16px 16px;
  ```
  React Flow's own `Background` component can stay if its variant/color is set to use the same token values; otherwise replace with the CSS pattern.
- Bottom-left zoom controls: 28×28 buttons stacked vertically inside a `bg-wire-surface border border-wire rounded-md` container (per `WorkspaceTab.jsx`). Use Lucide `Plus`, `Minus`, `Maximize2`, `Lock` at 14px / 1.5px stroke.
- Bottom-right minimap: keep `showMiniMap` but style its border to `border border-wire rounded-md` and shrink to ~140×96.
- Top-right: stack `WireValidationPanel` and `WireInspector` as 320px wide cards, each `bg-wire-surface border border-wire rounded-md shadow-wire-sm`. Strip the `rgba(255,255,255,0.96)` inline styles in `WiresClient.tsx` and route to tokens.

**Scope (canvas mode bar — `Canvas / JSON / SVG / Mermaid`)**
- Use the new `<TabSegment>` primitive from Phase 2.
- Right side of the mode bar: status pill (`Valid` / `Review`) + `Reset` icon button, both reusing Phase 2 primitives.

**Files touched**
- `apps/playground/app/wires/WiresClient.tsx` (header is Phase 2; here we restructure the main grid from `[260px_minmax(0,1fr)]` to `[260px_220px_minmax(0,1fr)_390px]`)
- `apps/playground/app/_components/{NavRail,ToolRail,CanvasFrame,ZoomControls}.tsx` (new)
- `packages/wire-react/src/components/WirePalette.tsx` — accept a `variant="rail" | "floating"` prop; rail variant renders without inner padding/background since the rail handles it
- `apps/playground/app/edit/canvas.tsx` — same canvas paper treatment; reuse `<CanvasFrame>` so all editor surfaces share it

**Acceptance**
- Hard-diff `/wires` against `Screenshot 2026-04-29 at 23.53.26.png` — dark nav, tool rail, canvas dot grid, top-right validation/inspector cards, bottom-left zoom buttons, mini-map all match.
- Single keystroke `T`/`A`/`L`/`N`/`C`/`H`/`R` from the rail spawns the right kind of node on the canvas.
- No `style={{ background: "rgba(255,255,255,0.96)", ... }}` literals remain.

**Risks**
- React Flow's default `Background` component may conflict with the CSS-only dot grid; pick one and stick to it.
- Adding a 220px tool rail eats horizontal space — verify the canvas still renders comfortably at 1280px (laptop minimum) by collapsing the dark nav to 220px (matches capture) and keeping the chat at 390px.
- `/playground` (unauth) does not get a tool rail per the user's "no user sidebar" exclusion — keep its layout at `[minmax(0,1fr)_390px]`.

---

## Phase 4 — Cards, kind chips, validation, inspector

**Goal:** every node card on the canvas, every list row in the rail, every chip and badge use the DS palette and shape rules.

**Scope (kind chip + node card primitives)**
- Lift `KindChip`, `NodeCard`, `GroupFrame`, `Edge`, `DotGrid`, `Eyebrow`, `Ref`, `StatusPill`, `InlineCode`, `CodeBlock` from `Wire Design System/ui_kits/playground/WireBits.jsx` into `packages/wire-react/src/primitives/` as TS components. These are the canonical leaf primitives the DS expects to be reusable across surfaces.
- Replace the bespoke node card rendering in `packages/wire-react/src/components/WireNodeCardView.tsx` with the new `<NodeCard>`. Card spec: `bg-wire-surface border border-wire rounded-lg p-[10px_12px] flex flex-col gap-1 min-w-[140px]`. Selected = `border-wire-focus shadow-[0_0_0_2px_var(--wire-blue-500)_inset]` — no elevation change.
- `<KindChip>` renders the kind hue **only** in the chip; the card itself stays white/`slate-800-dark`. Anti-pattern check: explicitly forbid colored left-border stripes (already in CLAUDE.md and DS).
- `<GroupFrame>`: dashed/solid border depending on selection; eyebrow + count in the top edge per `Screenshot 2026-04-29 at 23.14.49.png`.
- `WireValidationPanel`: switch the success/warn/error states to the `<StatusPill>` primitive; bullet rows use a 6px dot in the matching status hue.
- `WireInspector` / `WireOptionPanel`: option labels become 11.5px medium with 3px gap to inputs; inputs are `border border-wire rounded-md p-[5px_9px] text-[12.5px] bg-wire-surface`. The footer "Valid" indicator becomes the same `<StatusPill kind="valid">`.

**Scope (node-list rail rows in `WireNodeList`)**
- Each row: tiny KindChip on the left + `<strong>title</strong>` + `<small>kind</small>` underneath. Active row = `bg-wire-sunken`. No border, no shadow.

**Scope (Mermaid / SVG view modes)**
- The Mermaid + SVG export panes (in `WiresClient.tsx`) should render their source inside `<CodeBlock>` (the new `bg-wire-code` block) with `JetBrains Mono`. Drop the JSON `bg-slate-950 p-4 font-mono text-[12px] text-slate-100` literal.

**Files touched**
- `packages/wire-react/src/primitives/{KindChip,NodeCard,GroupFrame,Edge,DotGrid,Eyebrow,StatusPill,InlineCode,CodeBlock}.tsx` (new)
- `packages/wire-react/src/components/{WireNodeCardView,WireNodeList,WireValidationPanel,WireInspector,WireOptionPanel,WirePalette}.tsx`
- `apps/playground/app/wires/WiresClient.tsx` (replace JSON / SVG / Mermaid panes)
- `apps/playground/app/playground/PlaygroundClient.tsx` (same JSON pane treatment)
- Run `npm run build -w @aigentive/wire-react` after each touched file so the playground's `dist/` import sees the change (per CLAUDE.md).

**Acceptance**
- Every kind chip on the canvas pulls its hue from the DS tokens, including dark-mode variants (`rgba(...)` bgs).
- No node card has a colored left-border stripe.
- `WireValidationPanel`, `WireInspector`, `WireOptionPanel` all render with consistent type, spacing, and chip styling.
- The `/wires` JSON / SVG / Mermaid panes now use the dark indigo code block bg (`--wire-bg-code`), matching the DS code-block specimen.

**Risks**
- `WireNodeCardView` is the entry point for *all* canvas card rendering (default + custom `renderNodeCard`). Make the new primitive a 100% drop-in by preserving the exact same React props contract.
- Tests in `packages/wire-react/src/components.test.tsx` need updating to reflect the new class names / DOM shape.

---

## Phase 5 — Dark mode, motion, and polish

**Goal:** every surface respects `<html class="dark">` per the DS, all transitions match the 80–200ms scale, no remaining anti-patterns.

**Scope**
- Walk every component shipped in Phases 1–4 and verify dark-mode behavior against the DS captures' implied dark palette (use the `.dark { ... }` block in `colors_and_type.css`). Catch and fix anywhere that hardcodes `dark:bg-slate-800` / `dark:border-slate-700` instead of routing through the variable cascade.
- Replace any `transition-all` usage with `transition-colors duration-120` (the DS default `--wire-duration-fast`). Keep theme transitions at `200ms`. Remove any spring/scale animations.
- Audit every interactive element for the DS hover/press rules:
  - Buttons / pills: background-color shift one step darker; no scale, no shadow change.
  - Tabs: hovered tab gets `slate-900` text; active tab adds 2px underline + bold.
  - Cards: hover = `border-wire-strong`; selected = `border-wire-focus + 2px inset blue ring`. **No elevation shift on hover.**
- Audit icons: every Lucide must be 1.5px stroke (`strokeWidth={1.5}`) at 16/20px. Remove any `strokeWidth={2.25}` / `2.5` instances introduced in the docs landing.
- Final anti-pattern sweep:
  - No `backdrop-blur` anywhere.
  - No `gradient-to-*` utilities.
  - No `rounded-xl` / `rounded-2xl` in core UI (only `rounded-full` allowed for the LIGHT/DARK pill and kind chips).
  - No `shadow-lg` / `shadow-xl` (only `shadow-wire-sm` / `shadow-wire-md`).
  - No emoji, no exclamation points in user-facing copy. Sweep `/(docs)/page.tsx`, `/(docs)/install`, `/(docs)/concepts`, etc.
  - No colored left-border cards in any callout, banner, or surface.
- Add `font-feature-settings: "tnum" 1;` to numeric displays (cost pills, token counts, stats, mini-map dimensions) so columns align.

**Files touched**
- All Phase 1–4 outputs
- `apps/playground/app/_components/Callout.tsx` (anti-pattern sweep)
- `apps/playground/app/(docs)/install/*`, `concepts/*`, `examples/*` for copy-tone sweep

**Acceptance**
- Toggling LIGHT/DARK on `/`, `/install`, `/playground`, `/wires`, `/edit/[id]`, `/preview/inline?d=...` produces a clean palette swap with zero element flickering or hardcoded color leaks.
- Lighthouse-style visual diff against `Wire Design System/uploads/Screenshot 2026-04-30 at 09.15.44.png` (canvas), `127.0.0.1_3872_components (1).png` and `(2).png` (cards & events tabs) at within ~3% pixel parity in the major regions.
- Anti-pattern grep returns clean: `rg -n "backdrop-blur|gradient-to-|rounded-xl|rounded-2xl|shadow-(lg|xl|2xl)|font-extrabold" apps/playground/app packages/wire-react/src` should print no results in core UI files.

**Risks**
- `font-extrabold` is used in `WiresClient.tsx` 30+ times; the sweep is mechanical but should be done last so earlier phases don't churn.
- React Flow ships its own selection ring; ensure the DS `border-wire-focus` overrides without losing pan/zoom interaction styles.

---

## Out of scope for this plan

- The authenticated `/playground` user sidebar (the `AuthenticatedWireSidebar` block) — left as-is per the user's request.
- The MCP server, CLI, and any non-UI package code.
- Marketing surfaces beyond `/wire` and the editor (no landing-page hero changes outside `(docs)/page.tsx`).
- Vercel deployment or env work — purely CSS / TSX.

## Ordering rationale

- **Phase 0 first**: every later phase consumes the tokens. Doing it later means rewriting components twice.
- **Phase 1 (docs) before Phase 2 (editor)**: docs are simpler, give us a low-risk surface to validate the token rollout, and most users land on `/wire` first.
- **Phase 2 (header + chat) before Phase 3 (editor canvas)**: header and chat primitives are shared between `/playground` and `/wires`, so they unblock both.
- **Phase 3 (editor chrome) before Phase 4 (cards)**: getting the rails right exposes any layout assumptions the cards need to respect.
- **Phase 5 last**: dark-mode + anti-pattern sweep is a final pass once everything else is settled.

## Verification recipe (run after each phase)

1. `npm run typecheck` and `npm run build` from repo root.
2. `npm run dev:playground` and visually walk every route touched.
3. Toggle LIGHT/DARK on the route — verify no hardcoded hex breaks the swap.
4. Open the corresponding screenshot from `Wire Design System/uploads/` side-by-side and diff brand row, eyebrow color, primary button, body type, card shape, chip palette.
5. Run the anti-pattern grep (Phase 5 acceptance) — must print zero hits in newly-edited files.
