import { DocsPage } from "../../_components/DocsPage";
import { Prose, InlineCode } from "../../_components/Prose";
import { CodeBlock } from "../../_components/CodeBlock";
import { Callout } from "../../_components/Callout";

export const metadata = { title: "API · Hooks · Wire docs" };

const HOOKS: Array<{ name: string; signature: string; returns: string; purpose: string }> = [
  {
    name: "useWireDiagram",
    signature: "useWireDiagram(): WireDiagram",
    returns: "Current diagram (read-only).",
    purpose: "Read the live diagram in any descendant of WireProvider. Re-renders on diagram change."
  },
  {
    name: "useWireValidation",
    signature: "useWireValidation(): ValidationResult",
    returns: "{ valid, issues }",
    purpose: "Latest validation result. Pair with `validateOnChange` on WireProvider to keep it fresh."
  },
  {
    name: "useWireSelection",
    signature: "useWireSelection(): readonly [WireSelection, WireSelectionActions]",
    returns: "[selection, { setSelection, clearSelection }]",
    purpose: "Read or drive selection state. Use `clearSelection()` from a custom panel; `setSelection({ nodeIds: [id], edgeIds: [] })` to focus a node."
  },
  {
    name: "useWireViewport",
    signature: "useWireViewport(): readonly [WireViewport, WireViewportActions]",
    returns: "[{ x, y, zoom }, { setViewport }]",
    purpose: "Read or drive pan/zoom. Useful when a sidebar action needs to recenter the canvas."
  },
  {
    name: "useWireMode",
    signature: "useWireMode(): readonly [\"view\" | \"edit\", (next) => void]",
    returns: "[mode, setMode]",
    purpose: "Read and toggle the editor mode. Bind to a top-bar button; canvas + cards respond automatically."
  },
  {
    name: "useWireActions",
    signature: "useWireActions(): { dispatch, dispatchMany, validate }",
    returns: "Action dispatchers + on-demand validate.",
    purpose: "Lower-level access when you need to dispatch a batch atomically (`dispatchMany`)."
  },
  {
    name: "useWireDispatch",
    signature: "useWireDispatch(): (action: WireAction) => void",
    returns: "Single-action shorthand.",
    purpose: "Compact `dispatch` for one-off mutations from custom UI (rename a node, change tone)."
  },
  {
    name: "useWireHistory",
    signature: "useWireHistory(): { canUndo, canRedo, undo, redo }",
    returns: "Undo/redo state + actions.",
    purpose: "Wire to a toolbar's undo/redo buttons. Provider tracks history automatically."
  },
  {
    name: "useWireEvents",
    signature: "useWireEvents(): { emit }",
    returns: "Programmatic event emitter.",
    purpose: "Emit a WireEvent from app code (e.g., `node.inspect` from a side panel) — flows through `onEvent` like canvas-emitted events."
  },
  {
    name: "useWireContext",
    signature: "useWireContext(): WireContextValue",
    returns: "Raw context.",
    purpose: "Escape hatch — direct access to every slice. Prefer the targeted hooks above."
  }
];

export default function ApiHooksPage() {
  return (
    <DocsPage
      eyebrow="Reference"
      title="Hooks"
      description="Read or drive every slice of WireProvider state from your own components — diagram, selection, viewport, mode, history, validation, and events."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Reference" }, { label: "Hooks" }]}
    >
      <Prose>
        <h2 id="usage">Usage</h2>
        <p>
          All hooks must be called inside a <InlineCode>WireProvider</InlineCode> subtree. They re-render their host
          when the slice they read changes — the targeted hooks (<InlineCode>useWireSelection</InlineCode>,{" "}
          <InlineCode>useWireMode</InlineCode>, …) are tighter than reaching into the full context.
        </p>
      </Prose>

      <CodeBlock language="tsx">
        {`import {
  WireProvider,
  WireCanvas,
  useWireSelection,
  useWireMode,
  useWireHistory
} from "@aigentive/wire-react";

function Toolbar() {
  const [mode, setMode] = useWireMode();
  const { canUndo, canRedo, undo, redo } = useWireHistory();
  const [selection, { clearSelection }] = useWireSelection();

  return (
    <div className="flex gap-2">
      <button onClick={() => setMode(mode === "edit" ? "view" : "edit")}>
        {mode === "edit" ? "Done" : "Edit"}
      </button>
      <button disabled={!canUndo} onClick={undo}>Undo</button>
      <button disabled={!canRedo} onClick={redo}>Redo</button>
      <button disabled={!selection.nodeIds.length} onClick={() => clearSelection()}>Deselect</button>
    </div>
  );
}

export function App({ diagram }) {
  return (
    <WireProvider defaultDiagram={diagram}>
      <Toolbar />
      <WireCanvas mode="edit" fitView />
    </WireProvider>
  );
}`}
      </CodeBlock>

      <Prose>
        <h2 id="reference">Reference</h2>
      </Prose>

      <div className="not-prose grid gap-4">
        {HOOKS.map((hook) => (
          <section
            key={hook.name}
            id={hook.name.toLowerCase()}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <header className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
              <code className="font-mono text-[13px] font-bold text-slate-950 dark:text-slate-50">
                {hook.signature}
              </code>
            </header>
            <div className="grid gap-2 px-4 py-3 text-[13px] leading-6 text-slate-700 dark:text-slate-300">
              <p className="m-0">{hook.purpose}</p>
              <p className="m-0 text-[12px] text-slate-500 dark:text-slate-400">
                <strong className="text-slate-600 dark:text-slate-300">Returns:</strong> {hook.returns}
              </p>
            </div>
          </section>
        ))}
      </div>

      <Prose>
        <h2 id="patterns">Common patterns</h2>

        <h3 id="custom-inspector">Custom inspector tied to selection</h3>
        <p>
          Combine <InlineCode>useWireSelection</InlineCode> with <InlineCode>useWireDiagram</InlineCode> to render a
          panel that always reflects the active node — without prop drilling.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`function Inspector() {
  const diagram = useWireDiagram();
  const [{ nodeIds }] = useWireSelection();
  const node = diagram.nodes.find((n) => n.id === nodeIds[0]);
  if (!node) return <Empty />;
  return <NodeForm node={node} />;
}`}
      </CodeBlock>

      <Prose>
        <h3 id="programmatic-edit">Programmatic edits</h3>
        <p>
          Use <InlineCode>useWireDispatch</InlineCode> for one-off mutations and{" "}
          <InlineCode>useWireActions</InlineCode>&rsquo;s <InlineCode>dispatchMany</InlineCode> for atomic batches.
        </p>
      </Prose>
      <CodeBlock language="tsx">
        {`function RenameButton({ id }: { id: string }) {
  const dispatch = useWireDispatch();
  return (
    <button onClick={() => dispatch({ type: "node.patch", id, patch: { title: "Renamed" } })}>
      Rename
    </button>
  );
}

function ApplyTemplate() {
  const { dispatchMany } = useWireActions();
  return (
    <button onClick={() => dispatchMany([
      { type: "node.add", node: { id: "in", kind: "trigger", title: "Webhook" } },
      { type: "node.add", node: { id: "ai", kind: "ai", title: "Plan", from: "in", model: "fast-model" } }
    ])}>
      Insert template
    </button>
  );
}`}
      </CodeBlock>

      <Callout tone="tip" title="Re-render scope">
        Each hook re-renders only its caller, and only when its slice changes — a component that calls{" "}
        <InlineCode>useWireMode</InlineCode> doesn&rsquo;t re-render when the diagram changes. Reach for{" "}
        <InlineCode>useWireContext</InlineCode> only when you genuinely need multiple slices in one component.
      </Callout>
    </DocsPage>
  );
}
