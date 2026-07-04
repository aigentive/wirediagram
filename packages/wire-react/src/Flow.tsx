import { useMemo, type ReactElement, type ReactNode } from "react";
import { renderToSvg } from "@aigentive/wire-core";
import { compile, type FlowProps } from "./compile.js";
import type { WireDiagram, LayoutDirection } from "@aigentive/wire-core";

export interface FlowComponentProps extends FlowProps {
  /** Render mode. Default "svg" (always works, server-renderable). */
  mode?: "svg" | "json";
  /** Class name applied to the outer container. */
  className?: string;
  /** Inline style for the outer container. Default `{ width: '100%', height: '600px' }`. */
  style?: React.CSSProperties;
  /** Optional callback receiving the compiled diagram. */
  onCompile?: (diagram: WireDiagram) => void;
}

const DEFAULT_STYLE: React.CSSProperties = { width: "100%", height: 600 };

/**
 * `<Flow>` compiles its JSX children into a canonical Wire diagram and
 * renders it as inline SVG by default (works in any React tree — server
 * components, static export, RSC, plain SPA).
 *
 * - mode="svg" (default) — server-renderable inline SVG
 * - mode="json" — invisible; use `onCompile` to capture the JSON
 */
export function Flow({
  layout = "LR",
  id,
  title,
  children,
  mode = "svg",
  className,
  style,
  onCompile
}: FlowComponentProps): ReactElement {
  const diagram = useMemo(() => {
    return compile({
      type: Flow,
      props: { layout, id, title, children },
      key: null
    } as unknown as ReactElement<FlowProps>);
  }, [layout, id, title, children]);

  if (onCompile) onCompile(diagram);

  if (mode === "json") return <></>;
  const svg = renderToSvg(diagram);
  return (
    <div
      className={className}
      style={{ ...DEFAULT_STYLE, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * Hook exported as `useCompiledWireDiagram`: compile a JSX `<Flow>` tree into canonical Wire JSON. Useful when
 * you want to feed the diagram into `<WireProvider>` / `<WireCanvas>`:
 *
 * ```tsx
 * "use client";
 * import { useCompiledWireDiagram, WireProvider, WireCanvas, TriggerNode, AINode } from "@aigentive/wire-react";
 *
 * export function MyDiagram() {
 *   const diagram = useCompiledWireDiagram(
 *     <Flow layout="LR">
 *       <TriggerNode id="t" title="Trigger" />
 *       <AINode id="plan" title="Plan" from="t" />
 *     </Flow>
 *   );
 *   return <WireProvider diagram={diagram}><WireCanvas mode="view" /></WireProvider>;
 * }
 * ```
 */
export function useWireDiagram(flowElement: ReactElement<FlowProps>): WireDiagram {
  return useMemo(() => compile(flowElement), [flowElement]);
}

export type { LayoutDirection };
export type { ReactNode };
