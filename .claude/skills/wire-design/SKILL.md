---
name: wire-design
description: >
  Use whenever you are designing, revising, or polishing UI in this repo —
  the Wire Playground, the embedded React workspace, the docs surface, or
  the wire-react components. Translates broad feedback ("make it cleaner",
  "polish this", "easier to understand") into concrete UX changes:
  hierarchy, spacing, grouping, readability, affordance, state design.
trigger: "design|polish|cleaner|tidy up|easier to understand|move elements|improve styling|hierarchy|ux|ui|spacing|alignment|state|hover|focus|selected|empty state|loading|error state"
allowed-tools:
  - Read
  - Edit
  - Write
  - Grep
  - Bash
priority: 2
maxTokens: 9000
---

# Wire Design Skill — UI/UX Judgment for this Repo

Source rules: https://gist.github.com/adriandemian/07f9534883cca5a49c8f6414aada8a1f
Reference design system (local): `/Users/admin/Downloads/Wire Design System/`
(Read `editor.html`, `colors_and_type.css`, and the `preview/` specimens before inventing values.)

Your goal is **not** to make the UI prettier in isolation. Your goal is to make it **easier to understand, easier to use, more visually coherent, and more intentional**. Treat broad feedback as UX work, not cosmetic work.

---

## 0. Wire-specific non-negotiables

These override the generic guidance below — they reflect this repo's product language and CLAUDE.md rules.

- **Sentence case** for all UI text. ALL-CAPS + `0.08em` tracking only for eyebrow labels.
- **No emoji.** No exclamation points. Voice is library-README, not marketing.
- **One brand accent: blue-600** (`#2563EB`). Used for the eyebrow, active tab outline, primary links, the selected-node ring. Never as a fill for big surfaces.
- **No colored left-border cards.** The kind chip is the only place the kind hue appears on a card. (User-level rule in `~/.claude/CLAUDE.md`.)
- **Card itself stays white** (or `slate-900` in dark).
- **Radius scale: 4 / 6 / 8 px.** Pills (LIGHT/DARK toggle, kind chips, status chips) are the only `rounded-full` exception.
- **One shadow.** `0 1px 2px rgba(15,23,42,0.04)`. No glow, no inner shadow, no hover elevation pumping.
- **Borders are 1px slate-200** (light) / `slate-700` (dark). Selected = `blue-500` + 2px inset ring.
- **Dot-grid canvas** is Wire's only background texture: 1px slate dots on a 16px lattice at ~22% opacity. Use it on every canvas surface; do not use it anywhere else.
- **Inline code is everywhere.** Wrap every API name, prop, file path, and event type in backticks. Use JetBrains Mono.
- **No gradients. No backdrop-blur. No imagery in product UI.** (The `editor.html` reference uses backdrop-blur on floating panels — keep that scoped to the validation-panel/minimap chrome only, do not spread it.)
- **Tokens, not hex.** Read from `apps/playground/app/globals.css` (`bg-wire-page`, `bg-wire-surface`, `border-wire`, `text-wire-primary`, `text-wire-tertiary`, `wire-kind-*`, `wire-nav-*`, `wire-rail-*`). Never hardcode raw hex in components.
- **Wire kinds (chip-only, never card fill):** TRIGGER, AI, RETRIEVAL, TOOL, ACTION, END, HUMAN, NOTE, CONDITION (purple).

---

## 1. Core principles (apply on every revision)

- Preserve the existing layout unless the user explicitly asks for a redesign.
- Identify the **primary task** of the screen before changing visuals.
- Make the primary workspace or primary action visually dominant.
- Make secondary UI useful but quieter.
- Improve hierarchy **before** adding decoration.
- Use spacing, alignment, grouping, and typography **before** relying on borders, shadows, or color.
- Avoid over-boxing every element.
- Use color semantically and sparingly.
- Make active, selected, hover, focus, disabled, loading, and error states intentional.
- Do not duplicate controls unless repetition improves clarity or speed.
- Make related controls feel grouped; make unrelated controls feel separated.
- Keep dense product UIs calm. Avoid filler, fake metrics, decorative blobs, unnecessary gradients.

Before editing, classify each region: global nav · local nav · topbar · toolbar · sidebar · primary workspace · canvas · inspector · details panel · list · table · chat rail · form · modal · drawer · status area · validation area · empty/loading/error state.

---

## 2. Interpreting broad feedback (always translate into concrete UX moves)

| Phrase | What it usually means |
|---|---|
| "make it cleaner" | reduce visual noise, remove unnecessary borders/shadows/badges, improve spacing/alignment, clarify hierarchy, quiet secondary info, remove duplicate controls. **Do not just make everything white.** |
| "make it more polished" | normalize spacing/radius/shadow/type scale; improve selected/hover/focus/loading/disabled/error states; fix awkward wrapping/clipping/crowding; align adjacent panels; remove accidental-looking styles. |
| "improve styling" | improve hierarchy first, use design tokens, refine typography/spacing, strengthen active and quiet inactive states, reduce decorative treatment. |
| "move elements" | hierarchy/workflow problem. Move by task logic: global → topbar; local → near content; object-specific → near selected object/inspector; status where users notice. Don't move for symmetry. |
| "easier to understand" | improve information hierarchy, group related, rename vague labels, clarify current state, reduce simultaneous choices, expose selected object/mode, make next action obvious. |

---

## 3. Component playbooks

### App shell / dashboard
- Main workspace dominant. Nav/sidebars/inspectors/chat secondary.
- Topbar = global identity, location, status, global actions.
- Sidebars = navigation, object lists, tools, contextual controls.
- Center = primary work.
- Adjacent panels feel related; use subtle bg shifts/dividers, not heavy borders.
- **Common fix in Wire:** unify the wires sidebar + tool rail tonally so they read as a coordinated rail system, not two competing cards.

### Sidebar / navigation rail
- Calmer than main content. Active item unmistakable but readable.
- Refined selected states: subtle accent bar / soft selected bg / stronger text / thin border. Avoid full-black or full-color active fills unless the product already uses them.
- Group with spacing/section labels. Truncate long titles; never let them wrap badly.
- Hover quieter than selected. Action buttons must not look identical to nav items.
- **Wire-specific:** dark `NavRail` already uses `wire-nav-active` for selected — keep the white-on-elevated pattern, do not switch to a colored fill.

### Topbar / navbar
- Left: identity + current location. Right: global actions, status, account.
- Compact, stable height. Use breadcrumbs for nested objects.
- Visual order: identity → location → save/sync/status → primary actions → user/account.
- Don't crowd with local tools — push them down to the canvas/toolbar.

### Toolbar / command bar
- Live near the workspace they affect. Group related commands. Separators between groups.
- Active mode visually distinct. Don't mix nav tabs with command buttons without hierarchy.
- Icon-only OK for common/recognizable actions; pair with labels for uncommon ones.

### Tabs / segmented controls
- Mutually exclusive peer views only. One primary strip per region — no duplicates.
- More than 5–7 options → use a select, sidebar, or command menu instead.

### Canvas / workspace / editor surface
- Canvas = visual center. Surrounding panels quieter.
- Use grid/dots/guides only if they aid orientation. Don't let utilities overpower work.
- Zoom controls, minimap, validation: compact, anchored to edges/corners, **consistent chrome** (same bg/blur/border/shadow).
- Fit important work in the initial viewport. **Center and scale before adding decoration.**
- **Wire-specific recurring bug:** the graph drifts right because the validation-panel keepout reserves right padding but no symmetric left allowance. Compensate in `fitView` or graph offset, don't reposition nodes.

### Diagram / node graph
- Make the main path obvious. Distinguish start/decision/action/branch/loop/end visually.
- Edge direction clear. Avoid edge crossings. Branch labels close to the edge.
- Consistent node sizes unless hierarchy requires variation.
- Kind color = chip/border accent, not card fill.
- Selected nodes visible but not destructive. Repack the graph before shrinking text.

### Panels / cards / inspectors / validation
- Panels for meaningful grouping, not for boxing every element.
- Spacing + headings before borders/shadows.
- Floating panels feel attached to their trigger or workspace. Avoid heavy shadows unless truly floating.
- Validation panels surface most important state at the top.
- **Wire-specific:** the docked top-right validation panel and bottom-right minimap should share **one chrome treatment** (rgba-white + blur + 1px hairline + the single shadow). If they diverge, the canvas reads as two visual systems.

### Lists / tables / feeds
- Decide: browse / choose / compare / monitor.
- Primary label first. Secondary metadata quieter and aligned consistently.
- Compact rows for tools/admin, spacious for reading-heavy.
- Don't make every row a heavy card. Hide row actions until hover when appropriate.

### Chat / assistant rail
- Secondary to main work unless chat is the product. Visually separate by author/grouping/time.
- Composer anchored at bottom. Send action clear. Placeholder suggests expected input. Shortcut hints secondary.
- Multiline grows within limits. Disabled/loading/sending states clear.
- Distinguish suggestions from committed changes when chat affects the workspace.

### Forms / settings
- Group related fields. Labels close to controls. Validation near the field.
- Required fields clear without shouting. Sensible defaults. Progressive disclosure for advanced.
- Preserve user input on validation failure.

### Buttons / actions
- One primary action per region. Secondary quieter. Destructive distinct, not constantly alarming.
- Clear verbs. Pair icons with labels for uncommon actions. Loading states for async.
- Separate destructive from safe.

### Search / filters
- Near the content they filter. Placeholder describes scope.
- Active filters visible and removable. Result count when useful.
- Distinguish "no data" from "no matches" in empty states.

### Empty / loading / error states
- Useful, not decorative. Preserve layout shape during loading.
- Errors identify the problem and offer recovery. Validation near affected component.
- No alarming color for non-critical warnings.

### Modals / drawers / popovers
- Modals = blocking decisions only. Drawers = contextual edit preserving page context. Popovers = lightweight.
- Specific titles. Predictable primary action placement. Don't stack overlays.
- Don't use a modal when inline editing would be clearer.

### Docs / component playground
- Live examples before deep explanation. Separate overview, examples, props, usage, caveats.
- Code blocks with copy affordance. Show variants explicitly. Persistent nav for long docs.
- Code shouldn't visually overpower the component preview.

### Data viz / metrics
- Charts only when they clarify. Title by subject/insight. Label axes/units.
- No 3D, no random gradients. Color intentional. Highlight the important series.
- If everything is highlighted, nothing is.

---

## 4. Visual style discipline

Order of operations: **layout → spacing → hierarchy → typography → state → color → subtle depth.** Never start at color.

- Use design tokens. Keep radius/shadow/border/type scale consistent.
- Contrast clarifies importance. Whitespace creates grouping.
- Avoid loud gradients, glassmorphism, excessive blur, oversized shadows, decorative motifs unless the product already calls for them.
- Don't use emoji unless the product already uses emoji. (Wire does not.)
- Don't add icons just to fill space. Don't invent extra sections, stats, or marketing copy.
- Prefer restrained, production polish over flashy redesign.

---

## 5. Revision process for an existing Wire screen

1. Identify the screen's primary task (e.g., editing a wire, monitoring validation, browsing wires).
2. Identify the main workspace and all secondary regions.
3. Classify each region by component type (use list in §0).
4. Look for hierarchy problems: what competes with the primary task; what's too quiet; what's duplicated; what's visually disconnected; what's hard to scan.
5. Apply the relevant component rules above.
6. Preserve the layout unless the user asked for a redesign.
7. Make the **smallest structural change** that solves the UX issue.
8. Polish states, spacing, grouping, alignment.
9. Verify the screen still works and reads clearly. For UI changes, **start the dev server and use the feature in a browser** before reporting done.

---

## 6. Acceptance checklist

Before finalizing a UI revision in Wire:

- [ ] Primary task visually obvious?
- [ ] Current location clear (breadcrumb / selected wire / active tab)?
- [ ] Selected object / active state clear?
- [ ] Global, local, contextual controls separated?
- [ ] Related items grouped; unrelated separated?
- [ ] No accidental duplicate controls?
- [ ] Main workspace more prominent than support UI?
- [ ] Sidebars/panels/overlays calm enough not to compete?
- [ ] Active, hover, focus, disabled, loading, error states all handled?
- [ ] Component readable at intended size (zoom, density)?
- [ ] Labels specific and action-oriented (no "Submit", no "Click here")?
- [ ] Color semantic and sparing — no decorative kind tinting?
- [ ] No filler, fake metrics, or decoration without purpose?
- [ ] Tokens used (no raw hex)?
- [ ] Wire non-negotiables in §0 still satisfied?
- [ ] Did the revision solve the UX intent, not just change visuals?

---

## 7. How to summarize your changes

When explaining what you changed, summarize in **UX outcomes**, not visual adjectives:

- clearer hierarchy
- calmer sidebar
- stronger selected state
- better scanability
- reduced duplication
- improved canvas focus
- better affordance
- tighter grouping
- improved readability
- more cohesive visual system

Don't over-explain. The diff should demonstrate the design judgment.

---

## 8. Common Wire revision recipes

These are the patches that keep coming up in this repo — apply directly when the symptom matches.

| Symptom | Likely cause | Fix |
|---|---|---|
| Canvas feels cramped, graph runs off the right | Column widths drifted from spec (`260/220/1fr/390` vs `224/196/1fr/320`) | Tighten the four columns in `WiresClient.tsx:756`. |
| Graph hugs the right side of the canvas | `fitView` reserves right padding for the validation panel but not symmetric left | Add a left keepout / x-offset in the graph viewport, or center after fit. |
| Floating panels look mismatched | Validation panel and minimap diverged on chrome | Unify: same `rgba(255,255,255,0.88)` + `backdrop-blur(14px) saturate(1.2)` + 1px hairline + the single shadow stack. |
| Sidebar feels heavy | Borders + active fill + hover bg all firing at once | Drop borders, lean on `wire-nav-active` for selected, keep hover at `wire-nav-bg-hover`. |
| Card kind reads as decoration | Kind color used as gradient / left stripe / fill | Push kind color to the chip only. Top-accent border is the project compromise. |
| Topbar feels crowded | Local controls leaked up | Move them down to the canvas bar; topbar = global only. |
| User can't tell what mode they're in (Canvas / JSON / SVG / Mermaid) | Active segmented state too soft | Strengthen contrast on the active button (slate-900 fill, white text — already in spec). |
| Chat rail steals attention | Bubbles + heavy borders + background all loud | Quiet the assistant bubble (single hairline + tiny shadow), keep user gradient, soften composer container. |
