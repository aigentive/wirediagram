"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  Code2,
  DollarSign,
  FileJson,
  Loader2,
  MessageSquare,
  Play,
  RefreshCcw,
  Send,
  Wrench
} from "lucide-react";
import {
  parseWireDiagram,
  validate,
  type ValidationResult,
  type WireDiagram
} from "@aigentive/wire-core";
import {
  WireCanvas,
  WireProvider,
  WireToolbar,
  WireValidationPanel
} from "@aigentive/wire-react";
import { INITIAL_PLAYGROUND_DIAGRAM } from "./initial-diagram";

type Usage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

type CostInfo = {
  model: string;
  usage: Usage;
  costUsd: number | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  cost?: CostInfo;
};

type ToolTrace = {
  id: string;
  source: "host" | "model";
  tool: string;
  input: unknown;
  output: unknown;
  status: "ok" | "error";
  durationMs: number;
};

type ChatResponse = {
  diagram?: WireDiagram;
  validation?: ValidationResult;
  traces?: ToolTrace[];
  message?: string;
  error?: string;
  model?: string;
  usage?: Usage | null;
  costUsd?: number | null;
};

type JsonMode = "canvas" | "json";

export function PlaygroundClient({ initialDiagram }: { initialDiagram: WireDiagram }) {
  const [diagram, setDiagram] = useState<WireDiagram>(initialDiagram);
  const [jsonDraft, setJsonDraft] = useState(() => formatJson(initialDiagram));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [mode, setMode] = useState<JsonMode>("canvas");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Send a prompt and I will update the Wire JSON through MCP tools."
    }
  ]);
  const [input, setInput] = useState("Build me a random AI support workflow wireframe.");
  const [traces, setTraces] = useState<ToolTrace[]>([]);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [totalCostUsd, setTotalCostUsd] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [lastModel, setLastModel] = useState<string | null>(null);

  const validation = useMemo(() => validate(diagram), [diagram]);

  const acceptDiagram = useCallback((next: WireDiagram) => {
    setDiagram(next);
    setJsonDraft(formatJson(next));
    setJsonError(null);
  }, []);

  const handleCanvasChange = useCallback(
    (next: WireDiagram) => {
      acceptDiagram(next);
    },
    [acceptDiagram]
  );

  const applyJson = useCallback(() => {
    try {
      const parsed = parseWireDiagram(JSON.parse(jsonDraft));
      acceptDiagram(parsed);
      setMode("canvas");
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : String(err));
    }
  }, [acceptDiagram, jsonDraft]);

  const reset = useCallback(() => {
    acceptDiagram(INITIAL_PLAYGROUND_DIAGRAM);
    setTraces([]);
    setApiError(null);
    setTotalCostUsd(0);
    setTotalTokens(0);
    setLastModel(null);
    setMessages([
      {
        role: "assistant",
        content: "Send a prompt and I will update the Wire JSON through MCP tools."
      }
    ]);
  }, [acceptDiagram]);

  const submit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || busy) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      setBusy(true);
      setApiError(null);

      try {
        const res = await fetch("/api/playground/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            diagram,
            history: messages.slice(-8)
          })
        });
        const data = await readChatResponse(res);
        if (!res.ok || data.error) {
          throw new Error(data.error ?? `Request failed with ${res.status}`);
        }
        if (data.diagram) {
          acceptDiagram(data.diagram);
        }
        setTraces(data.traces ?? []);
        const cost: CostInfo | undefined =
          data.usage && data.model
            ? { model: data.model, usage: data.usage, costUsd: data.costUsd ?? null }
            : undefined;
        if (cost) {
          setLastModel(cost.model);
          setTotalTokens((prev) => prev + cost.usage.totalTokens);
          if (typeof cost.costUsd === "number") {
            setTotalCostUsd((prev) => prev + (cost.costUsd ?? 0));
          }
        }
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: data.message ?? "Wire diagram updated.",
            cost
          }
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setApiError(message);
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: message
          }
        ]);
      } finally {
        setBusy(false);
      }
    },
    [acceptDiagram, busy, diagram, input, messages]
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-950">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <Link href="/" className="flex items-center gap-2 text-slate-950 no-underline">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-slate-950 text-white">
            <Wrench size={15} />
          </span>
          <span className="text-[15px] font-bold">Wire</span>
        </Link>
        <span className="hidden text-[13px] font-semibold text-slate-500 sm:inline">Playground</span>
        <div className="ml-auto flex items-center gap-2">
          <CostPill model={lastModel} totalCostUsd={totalCostUsd} totalTokens={totalTokens} />
          <StatusPill validation={validation} busy={busy} />
          <Link
            href="/contact"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[13px] font-bold text-slate-700 no-underline hover:border-slate-300 hover:text-slate-950"
          >
            Contact
          </Link>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="flex min-h-[58vh] min-w-0 flex-col border-b border-slate-200 bg-slate-100 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
            <SegmentedButton active={mode === "canvas"} onClick={() => setMode("canvas")} icon={<Play size={14} />}>
              Canvas
            </SegmentedButton>
            <SegmentedButton active={mode === "json"} onClick={() => setMode("json")} icon={<FileJson size={14} />}>
              JSON
            </SegmentedButton>
            <button
              type="button"
              onClick={reset}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-bold text-slate-700 hover:border-slate-300 hover:text-slate-950"
            >
              <RefreshCcw size={13} />
              Reset
            </button>
          </div>

          {mode === "canvas" ? (
            <WireProvider diagram={diagram} onChange={handleCanvasChange}>
              <div className="relative min-h-0 flex-1">
                <div className="absolute left-3 top-3 z-10">
                  <WireToolbar />
                </div>
                <div className="absolute right-3 top-3 z-10 w-[min(320px,calc(100%-24px))]">
                  <WireValidationPanel />
                </div>
                <WireCanvas
                  mode="edit"
                  fitView
                  showMiniMap
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
              </div>
            </WireProvider>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col bg-slate-950">
              <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-800 px-3">
                <button
                  type="button"
                  onClick={applyJson}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-500 px-3 text-[12px] font-extrabold text-emerald-950 hover:bg-emerald-400"
                >
                  <Check size={14} />
                  Apply
                </button>
                {jsonError ? (
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-[12px] font-semibold text-red-300">
                    <AlertCircle size={13} />
                    {jsonError}
                  </span>
                ) : null}
              </div>
              <textarea
                value={jsonDraft}
                onChange={(event) => setJsonDraft(event.target.value)}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none border-0 bg-slate-950 p-4 font-mono text-[12px] leading-5 text-slate-100 outline-none"
              />
            </div>
          )}
        </section>

        <aside className="flex min-h-[42vh] min-w-0 flex-col bg-white lg:min-h-0">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
            <MessageSquare size={15} className="text-slate-500" />
            <span className="text-[13px] font-extrabold">Chat</span>
            <span className="ml-auto text-[12px] font-semibold text-slate-500">
              {diagram.nodes.length} nodes
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            <div className="grid gap-3">
              {messages.map((message, index) => (
                <ChatBubble key={`${message.role}-${index}`} message={message} />
              ))}
              {busy ? (
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  Running tools
                </div>
              ) : null}
            </div>

            <ToolTraceList traces={traces} />

            {apiError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-[12px] font-semibold leading-5 text-red-700">
                {apiError}
              </div>
            ) : null}
          </div>

          <form onSubmit={submit} className="shrink-0 border-t border-slate-200 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                rows={3}
                className="min-h-[76px] flex-1 resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 text-slate-950 outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={busy || input.trim().length === 0}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Send"
                title="Send"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </aside>
      </main>
    </div>
  );
}

function StatusPill({ validation, busy }: { validation: ValidationResult; busy: boolean }) {
  if (busy) {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-50 px-2.5 text-[12px] font-bold text-blue-700">
        <Loader2 size={13} className="animate-spin" />
        Working
      </span>
    );
  }
  if (validation.valid) {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 text-[12px] font-bold text-emerald-700">
        <Check size={13} />
        Valid
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-amber-50 px-2.5 text-[12px] font-bold text-amber-700">
      <AlertCircle size={13} />
      Review
    </span>
  );
}

function SegmentedButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-950 px-3 text-[12px] font-extrabold text-white"
          : "inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 hover:border-slate-300 hover:text-slate-950"
      }
    >
      {icon}
      {children}
    </button>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const assistant = message.role === "assistant";
  return (
    <div className={assistant ? "mr-5" : "ml-5"}>
      <div
        className={
          assistant
            ? "rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-5 text-slate-700"
            : "rounded-md bg-blue-600 p-3 text-[13px] font-medium leading-5 text-white"
        }
      >
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide opacity-75">
          {assistant ? <Bot size={12} /> : <MessageSquare size={12} />}
          {assistant ? "Assistant" : "User"}
        </div>
        {message.content}
        {assistant && message.cost ? <CostLine cost={message.cost} /> : null}
      </div>
    </div>
  );
}

function CostLine({ cost }: { cost: CostInfo }) {
  const { usage, costUsd, model } = cost;
  const cached = usage.cachedInputTokens > 0 ? ` (${formatTokens(usage.cachedInputTokens)} cached)` : "";
  const reasoning = usage.reasoningTokens > 0 ? ` · ${formatTokens(usage.reasoningTokens)} reasoning` : "";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-slate-200 pt-1.5 text-[11px] font-semibold text-slate-500">
      <span className="font-bold text-slate-700">{costUsd === null ? "—" : formatUsd(costUsd)}</span>
      <span className="text-slate-300">·</span>
      <span>
        {formatTokens(usage.inputTokens)} in{cached} / {formatTokens(usage.outputTokens)} out{reasoning}
      </span>
      <span className="text-slate-300">·</span>
      <span className="truncate">{model}</span>
    </div>
  );
}

function CostPill({
  model,
  totalCostUsd,
  totalTokens
}: {
  model: string | null;
  totalCostUsd: number;
  totalTokens: number;
}) {
  if (!model && totalTokens === 0) return null;
  return (
    <span
      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-100 px-2.5 text-[12px] font-bold text-slate-700"
      title={model ? `${model} · ${totalTokens.toLocaleString()} tokens` : undefined}
    >
      <DollarSign size={13} />
      {formatUsd(totalCostUsd)}
      {model ? <span className="hidden text-slate-400 sm:inline">· {model}</span> : null}
    </span>
  );
}

function formatUsd(usd: number): string {
  if (!Number.isFinite(usd) || usd === 0) return "$0.00";
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(6)}`;
}

function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}

function ToolTraceList({ traces }: { traces: ToolTrace[] }) {
  if (traces.length === 0) return null;
  return (
    <section className="mt-4 grid gap-2">
      <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
        <Code2 size={13} />
        MCP
      </div>
      {traces.map((trace) => (
        <details key={trace.id} className="rounded-md border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[12px] font-bold text-slate-700">
            <span
              className={
                trace.status === "ok"
                  ? "h-2 w-2 rounded-full bg-emerald-500"
                  : "h-2 w-2 rounded-full bg-red-500"
              }
            />
            <span className="min-w-0 flex-1 truncate">{trace.tool}</span>
            <span className="shrink-0 text-slate-400">{trace.durationMs}ms</span>
          </summary>
          <pre className="max-h-56 overflow-auto border-t border-slate-100 bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
            {JSON.stringify({ source: trace.source, input: trace.input, output: trace.output }, null, 2)}
          </pre>
        </details>
      ))}
    </section>
  );
}

function formatJson(diagram: WireDiagram): string {
  return JSON.stringify(diagram, null, 2);
}

async function readChatResponse(res: Response): Promise<ChatResponse> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ChatResponse;
  } catch {
    throw new Error(
      `Server returned non-JSON (${res.status}). ${htmlToTextSnippet(text)}`
    );
  }
}

function htmlToTextSnippet(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}
