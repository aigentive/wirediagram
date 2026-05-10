"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  Code2,
  DollarSign,
  FileJson,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  Play,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserCheck
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
import type { WireSummary } from "@/lib/wires-store";
import { DEFAULT_LLM_MODEL, type LlmModelId } from "@/lib/llm-cost";
import { EditorHeader } from "../_components/wire-brand";
import { DotPillStatic, StatusPill as StatusPillBase } from "../_components/wire-pill";
import {
  ChatBubble as SharedChatBubble,
  ChatComposer,
  ChatModelFooter,
  StoredKeyFooterPanel,
  UserLockPanel
} from "../_components/wire-chat";
import { CanvasFrame } from "../_components/wire-editor";

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
  costNanoUsd: number | null;
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
  code?: string;
  model?: string;
  usage?: Usage | null;
  costUsd?: number | null;
  costNanoUsd?: number | null;
};

type JsonMode = "canvas" | "json";

type AuthenticatedUser = {
  email: string;
  name: string | null;
  image: string | null;
};

type WireCreateResponse = {
  wire?: WireSummary;
  error?: string;
};

type LockReason = "ip" | "user" | null;

type StoredKeyMeta = {
  configured: boolean;
  last4: string | null;
};

export function PlaygroundClient({
  initialDiagram,
  initialToken = null,
  isAuthenticated,
  googleAuthConfigured,
  user = null,
  initialWires = []
}: {
  initialDiagram: WireDiagram;
  initialToken?: string | null;
  isAuthenticated: boolean;
  googleAuthConfigured: boolean;
  user?: AuthenticatedUser | null;
  initialWires?: WireSummary[];
}) {
  const [diagram, setDiagram] = useState<WireDiagram>(initialDiagram);
  const [jsonDraft, setJsonDraft] = useState(() => formatJson(initialDiagram));
  const [shareToken, setShareToken] = useState<string | null>(initialToken);
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
  const [selectedModel, setSelectedModel] = useState<LlmModelId>(DEFAULT_LLM_MODEL);
  const [lockReason, setLockReason] = useState<LockReason>(null);
  const [storedKey, setStoredKey] = useState<StoredKeyMeta>({ configured: false, last4: null });
  const [cloudWires, setCloudWires] = useState<WireSummary[]>(initialWires);
  const [wireQuery, setWireQuery] = useState("");
  const [creatingWire, setCreatingWire] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const validation = useMemo(() => validate(diagram), [diagram]);
  const filteredCloudWires = useMemo(() => {
    const q = wireQuery.trim().toLowerCase();
    if (!q) return cloudWires;
    return cloudWires.filter((wire) => wire.title.toLowerCase().includes(q));
  }, [cloudWires, wireQuery]);

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
    setShareToken(null);
    setMessages([
      {
        role: "assistant",
        content: "Send a prompt and I will update the Wire JSON through MCP tools."
      }
    ]);
  }, [acceptDiagram]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = shareToken ? `/playground?d=${shareToken}` : "/playground";
    if (window.location.pathname + window.location.search !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [shareToken]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, traces, busy, apiError, lockReason]);

  useEffect(() => {
    if (!isAuthenticated) {
      setStoredKey({ configured: false, last4: null });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/user/openai-key");
        if (!res.ok) return;
        const data = (await res.json()) as StoredKeyMeta;
        if (!cancelled && typeof data.configured === "boolean") {
          setStoredKey({ configured: data.configured, last4: data.last4 ?? null });
        }
      } catch {
        // Best-effort. Lock panel still works without prefetched state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const saveStoredKey = useCallback(
    async (key: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/user/openai-key", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key })
        });
        const data = (await res.json()) as StoredKeyMeta & { error?: string };
        if (!res.ok || data.error) {
          return data.error ?? `Request failed with ${res.status}`;
        }
        setStoredKey({ configured: data.configured, last4: data.last4 ?? null });
        setLockReason(null);
        setApiError(null);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    },
    []
  );

  const clearStoredKey = useCallback(async () => {
    try {
      await fetch("/api/user/openai-key", { method: "DELETE" });
    } finally {
      setStoredKey({ configured: false, last4: null });
    }
  }, []);

  const submit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || busy) return;
      if (lockReason && !storedKey.configured) return;

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
            history: messages,
            model: selectedModel
          })
        });
        const data = await readChatResponse(res);
        if (res.status === 429) {
          if (data.code === "ip-quota-exceeded") setLockReason("ip");
          else if (data.code === "user-quota-exceeded") setLockReason("user");
        }
        if (!res.ok || data.error) {
          throw new Error(data.error ?? `Request failed with ${res.status}`);
        }
        if (data.diagram) {
          acceptDiagram(data.diagram);
          void persistToken(data.diagram).then((token) => {
            if (token) setShareToken(token);
          });
        }
        setTraces(data.traces ?? []);
        const cost: CostInfo | undefined =
          data.usage && data.model
            ? {
                model: data.model,
                usage: data.usage,
                costUsd: data.costUsd ?? null,
                costNanoUsd: data.costNanoUsd ?? null
              }
            : undefined;
        if (cost) {
          setLastModel(cost.model);
          setTotalTokens((prev) => prev + cost.usage.totalTokens);
          const costNanoUsd = cost.costNanoUsd;
          const costUsd = cost.costUsd;
          if (typeof costNanoUsd === "number") {
            setTotalCostUsd((prev) => prev + costNanoUsd / 1_000_000_000);
          } else if (typeof costUsd === "number") {
            setTotalCostUsd((prev) => prev + costUsd);
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
    [acceptDiagram, busy, diagram, input, lockReason, messages, selectedModel, storedKey.configured]
  );

  const openGooglePopup = useCallback(async () => {
    if (typeof window === "undefined") return;
    const popup = window.open(
      "about:blank",
      "wire-google-auth",
      "popup=yes,width=520,height=680,menubar=no,toolbar=no,location=no,status=no"
    );
    const importToken = await persistToken(diagram);
    if (importToken) setShareToken(importToken);

    const nextUrl = importToken ? `/wires?import=${encodeURIComponent(importToken)}` : "/wires";
    const callbackUrl = `/auth/popup-complete?next=${encodeURIComponent(nextUrl)}`;
    const authUrl = googleAuthConfigured
      ? `/api/google-auth?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    if (!popup) {
      window.location.assign(authUrl);
      return;
    }
    popup.location.assign(authUrl);
    let timer: number | null = null;
    function closeListener() {
      window.removeEventListener("message", handleAuthComplete);
      if (timer) window.clearInterval(timer);
    }
    function handleAuthComplete(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; next?: unknown };
      if (data.type !== "wire:auth-complete") return;
      closeListener();
      const next = typeof data.next === "string" && isInternalPath(data.next) ? data.next : nextUrl;
      window.location.assign(next);
    }
    window.addEventListener("message", handleAuthComplete);
    timer = window.setInterval(() => {
      if (!popup.closed) return;
      closeListener();
      window.location.reload();
    }, 600);
  }, [diagram, googleAuthConfigured]);

  const createCloudWire = useCallback(async () => {
    if (!isAuthenticated || creatingWire) return;
    setCreatingWire(true);
    setApiError(null);
    try {
      const res = await fetch("/api/wires", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: diagram.title || "Untitled wire" })
      });
      const data = await readJsonResponse<WireCreateResponse>(res);
      if (!res.ok || data.error || !data.wire) {
        throw new Error(data.error ?? `Request failed with ${res.status}`);
      }
      setCloudWires((current) => upsertWireSummary(current, data.wire!));
      window.location.assign(`/wires?wire=${encodeURIComponent(data.wire.id)}`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingWire(false);
    }
  }, [creatingWire, diagram.title, isAuthenticated]);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-wire-page text-wire-primary">
      <EditorHeader breadcrumb="Playground">
        {isAuthenticated && user ? (
          <Link
            href="/wires"
            className="hidden min-w-0 sm:inline-flex"
            aria-label={user.name ?? user.email}
          >
            <DotPillStatic
              dotColor="emerald"
              icon={<UserCheck size={13} strokeWidth={1.5} />}
            >
              <span className="max-w-[180px] truncate">{user.name ?? user.email}</span>
            </DotPillStatic>
          </Link>
        ) : null}
        <CostPill model={lastModel} totalCostUsd={totalCostUsd} totalTokens={totalTokens} />
        <StatusPill validation={validation} busy={busy} />
        <Link href="/contact" className="no-underline">
          <DotPillStatic>Contact</DotPillStatic>
        </Link>
        {!isAuthenticated ? (
          <a
            href={
              googleAuthConfigured
                ? `/api/google-auth?callbackUrl=${encodeURIComponent("/wires")}`
                : `/login?callbackUrl=${encodeURIComponent("/wires")}`
            }
            className="inline-flex items-center gap-1.5 rounded-md bg-wire-primary px-3 py-1.5 text-[12px] font-bold text-white no-underline hover:opacity-90"
          >
            <LogIn size={13} strokeWidth={1.5} />
            Login
          </a>
        ) : null}
      </EditorHeader>

      <main
        className={
          isAuthenticated
            ? "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_390px]"
            : "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px]"
        }
      >
        {isAuthenticated && user ? (
          <AuthenticatedWireSidebar
            user={user}
            wires={filteredCloudWires}
            query={wireQuery}
            onQueryChange={setWireQuery}
            onCreateWire={createCloudWire}
            creatingWire={creatingWire}
          />
        ) : null}
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
              <CanvasFrame>
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
                  showBackground={false}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", backgroundColor: "transparent" }}
                />
              </CanvasFrame>
            </WireProvider>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col bg-wire-code">
              <div className="flex h-11 shrink-0 items-center gap-2 border-b border-wire px-3">
                <button
                  type="button"
                  onClick={applyJson}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-wire-status-valid px-3 text-[12px] font-bold text-white hover:opacity-90"
                >
                  <Check size={14} strokeWidth={1.5} />
                  Apply
                </button>
                {jsonError ? (
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-[12px] font-semibold text-wire-status-invalid">
                    <AlertCircle size={13} strokeWidth={1.5} />
                    {jsonError}
                  </span>
                ) : null}
              </div>
              <textarea
                value={jsonDraft}
                onChange={(event) => setJsonDraft(event.target.value)}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none border-0 bg-wire-code p-4 font-mono text-[12px] leading-[1.55] text-[var(--wire-fg-on-code)] outline-none"
              />
            </div>
          )}
        </section>

        <aside className="flex min-h-[42vh] min-w-0 flex-col bg-wire-surface lg:min-h-0">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-wire px-4">
            <MessageSquare size={15} strokeWidth={1.5} className="text-wire-tertiary" />
            <span className="text-[13px] font-bold">Chat</span>
            <span className="ml-auto text-[12px] font-semibold text-wire-tertiary">
              {diagram.nodes.length} nodes
            </span>
          </div>

          <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-auto px-4 py-3">
            <div className="grid gap-3">
              {messages.map((message, index) => (
                <ChatBubble key={`${message.role}-${index}`} message={message} />
              ))}
              {busy ? (
                <div className="flex items-center gap-2 text-[13px] font-semibold text-wire-tertiary">
                  <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                  Running tools
                </div>
              ) : null}
            </div>

            <ToolTraceList traces={traces} />

            {apiError ? (
              <div className="mt-3 rounded-md bg-wire-status-invalid-bg p-3 text-[12px] font-semibold leading-5 text-wire-status-invalid">
                {apiError}
              </div>
            ) : null}
          </div>

          {lockReason === "ip" && !isAuthenticated ? (
            <IpLockPanel
              googleAuthConfigured={googleAuthConfigured}
              onContinueWithGoogle={openGooglePopup}
            />
          ) : null}
          {lockReason === "user" && isAuthenticated && !storedKey.configured ? (
            <UserLockPanel busy={busy} onSaveKey={saveStoredKey} />
          ) : null}
          {storedKey.configured ? (
            <StoredKeyFooterPanel last4={storedKey.last4} onClear={() => void clearStoredKey()} />
          ) : null}
          <ChatComposer
            value={input}
            onChange={setInput}
            onSubmit={() => void submit()}
            busy={busy}
            disabled={Boolean(lockReason) && !storedKey.configured}
            footerSlot={
              <ChatModelFooter
                model={selectedModel}
                onModelChange={setSelectedModel}
                disabled={busy}
              />
            }
          />
        </aside>
      </main>
    </div>
  );
}

function AuthenticatedWireSidebar({
  user,
  wires,
  query,
  onQueryChange,
  onCreateWire,
  creatingWire
}: {
  user: AuthenticatedUser;
  wires: WireSummary[];
  query: string;
  onQueryChange: (value: string) => void;
  onCreateWire: () => void;
  creatingWire: boolean;
}) {
  return (
    <aside className="flex min-h-[220px] min-w-0 flex-col border-b border-slate-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
      <div className="grid gap-3 border-b border-slate-200 p-3">
        <div className="grid gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <UserCheck size={15} className="shrink-0 text-emerald-600" />
            <span className="truncate text-[13px] font-bold text-slate-950">Authenticated</span>
          </div>
          <div className="truncate text-[12px] font-semibold text-slate-500">{user.name ?? user.email}</div>
        </div>

        <button
          type="button"
          onClick={onCreateWire}
          disabled={creatingWire}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-[13px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {creatingWire ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          New Wire
        </button>

        <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-slate-500">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search wires..."
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-slate-950 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Active Wires</div>
        <div className="grid gap-1">
          {wires.map((wire) => (
            <Link
              key={wire.id}
              href={`/wires?wire=${encodeURIComponent(wire.id)}`}
              className="grid min-h-10 rounded-md px-2.5 py-2 text-left text-slate-700 no-underline hover:bg-slate-100 hover:text-slate-950"
            >
              <span className="truncate text-[13px] font-bold">{wire.title}</span>
              <span className="text-[11px] text-slate-400">{wire.nodeCount} nodes</span>
            </Link>
          ))}
          {wires.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 p-3 text-[13px] font-semibold leading-5 text-slate-500">
              No wires yet.
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 border-t border-slate-200 p-3">
        <Link
          href="/wires"
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 text-[13px] font-bold text-slate-700 no-underline hover:border-slate-300 hover:text-slate-950"
        >
          Open Wires
        </Link>
        <a
          href="/api/auth/signout"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 text-[13px] font-bold text-slate-500 no-underline hover:border-slate-300 hover:text-slate-950"
        >
          <LogOut size={14} />
          Sign out
        </a>
      </div>
    </aside>
  );
}

function IpLockPanel({
  googleAuthConfigured,
  onContinueWithGoogle
}: {
  googleAuthConfigured: boolean;
  onContinueWithGoogle: () => void;
}) {
  return (
    <section className="grid gap-2.5 border-t border-wire bg-wire-page px-4 py-3">
      <header className="flex items-start gap-2">
        <ShieldCheck size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-wire-tertiary" />
        <div className="grid gap-0.5">
          <h3 className="m-0 text-[13px] font-bold text-wire-primary">Free chat limit reached</h3>
          <p className="m-0 text-[12px] leading-[1.45] text-wire-secondary">
            Sign in to keep iterating on this wire.
          </p>
        </div>
      </header>
      <button
        type="button"
        onClick={onContinueWithGoogle}
        disabled={!googleAuthConfigured}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 text-[13px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-wire-sunken disabled:text-wire-muted"
      >
        <LogIn size={13} strokeWidth={1.5} />
        Continue with Google
      </button>
      {!googleAuthConfigured ? (
        <p className="m-0 text-[11px] leading-[1.4] text-wire-tertiary">
          Google sign-in is not configured in this deployment.
        </p>
      ) : null}
    </section>
  );
}


function StatusPill({ validation, busy }: { validation: ValidationResult; busy: boolean }) {
  if (busy) {
    return (
      <StatusPillBase
        kind="reserved"
        icon={<Loader2 size={13} strokeWidth={1.5} className="animate-spin" />}
      >
        Working
      </StatusPillBase>
    );
  }
  if (validation.valid) {
    return (
      <StatusPillBase kind="valid" dot icon={<Check size={13} strokeWidth={1.5} />}>
        Valid
      </StatusPillBase>
    );
  }
  return (
    <StatusPillBase
      kind="warn"
      icon={<AlertCircle size={13} strokeWidth={1.5} />}
    >
      Review
    </StatusPillBase>
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
          ? "inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-[12px] font-bold text-white"
          : "inline-flex h-8 items-center gap-1.5 rounded-md border border-wire bg-wire-surface px-3 text-[12px] font-bold text-wire-secondary hover:border-wire-strong hover:text-wire-primary"
      }
    >
      {icon}
      {children}
    </button>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  return (
    <SharedChatBubble
      role={message.role}
      cost={message.role === "assistant" && message.cost ? <CostLine cost={message.cost} /> : null}
    >
      {message.content}
    </SharedChatBubble>
  );
}

function CostLine({ cost }: { cost: CostInfo }) {
  const { usage, costUsd, model } = cost;
  const exactCostUsd = typeof cost.costNanoUsd === "number" ? cost.costNanoUsd / 1_000_000_000 : costUsd;
  const cached = usage.cachedInputTokens > 0 ? ` (${formatTokens(usage.cachedInputTokens)} cached)` : "";
  const reasoning = usage.reasoningTokens > 0 ? ` · ${formatTokens(usage.reasoningTokens)} reasoning` : "";
  return (
    <div className="wire-tabular mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-wire pt-1.5 text-[11px] font-semibold text-wire-tertiary">
      <span className="font-bold text-wire-secondary">{exactCostUsd === null ? "—" : formatUsd(exactCostUsd)}</span>
      <span className="text-wire-muted">·</span>
      <span>
        {formatTokens(usage.inputTokens)} in{cached} / {formatTokens(usage.outputTokens)} out{reasoning}
      </span>
      <span className="text-wire-muted">·</span>
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
    <DotPillStatic
      icon={<DollarSign size={13} strokeWidth={1.5} />}
      title={model ? `${model} · ${totalTokens.toLocaleString()} tokens` : undefined}
    >
      <span className="wire-tabular">{formatUsd(totalCostUsd)}</span>
      {model ? (
        <span className="hidden text-wire-tertiary sm:inline">· {model}</span>
      ) : null}
    </DotPillStatic>
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
      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">
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

function isInternalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function upsertWireSummary(wires: WireSummary[], wire: WireSummary): WireSummary[] {
  const next = wires.filter((item) => item.id !== wire.id);
  return [wire, ...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function persistToken(diagram: WireDiagram): Promise<string | null> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(diagram)
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return typeof data.token === "string" ? data.token : null;
  } catch {
    return null;
  }
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 240) || `Request failed with ${res.status}`);
  }
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
