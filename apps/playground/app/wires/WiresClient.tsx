"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  Download,
  FileJson,
  ImageIcon,
  KeyRound,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Share2,
  Terminal,
  Trash2,
  Workflow,
  Wrench,
  X
} from "lucide-react";
import { parseWireDiagram, renderToSvg, toMermaid, validate, type ValidationResult, type WireDiagram } from "@aigentive/wire-core";
import {
  WireCanvas,
  WireInspector,
  WirePalette,
  WireProvider,
  WireToolbar,
  WireValidationPanel
} from "@aigentive/wire-react";

type WireSummary = {
  id: string;
  title: string;
  currentToken: string;
  nodeCount: number;
  updatedAt: string;
  createdAt: string;
};

type UserInfo = {
  email: string;
  name: string | null;
  image: string | null;
};

type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  costUsd: number | null;
  createdAt: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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

type ApiKeySummary = {
  id: string;
  name: string;
  prefix: string;
  scopes: Array<"wires:read" | "wires:write" | "wires:delete">;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type Workspace = {
  wire: WireSummary;
  diagram: WireDiagram;
  chatMessages: StoredChatMessage[];
};

type WorkspaceMode = "canvas" | "json" | "svg" | "mermaid";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type WireLoadResponse = {
  wire?: WireSummary;
  diagram?: WireDiagram;
  validation?: ValidationResult;
  chatMessages?: StoredChatMessage[];
  error?: string;
};

type WireListResponse = {
  wires?: WireSummary[];
  error?: string;
};

type ApiKeyListResponse = {
  apiKeys?: ApiKeySummary[];
  error?: string;
};

type ApiKeyCreateResponse = {
  key?: string;
  apiKey?: ApiKeySummary;
  error?: string;
};

type ChatResponse = {
  wire?: WireSummary;
  diagram?: WireDiagram;
  validation?: ValidationResult;
  chatMessages?: StoredChatMessage[];
  message?: string;
  error?: string;
  traces?: ToolTrace[];
};

type ShareUrls = {
  view: string;
  edit: string | null;
  svg: string;
  png: string;
  json: string;
  mermaid: string;
  workspace: string | null;
};

type ShareResponse = {
  token?: string;
  viewToken?: string;
  editToken?: string | null;
  scope?: "view" | "edit";
  pinned?: boolean;
  urls?: ShareUrls;
  previewUrl?: string;
  editUrl?: string | null;
  error?: string;
};

export function WiresClient({
  user,
  initialWires,
  initialActiveWireId = null
}: {
  user: UserInfo;
  initialWires: WireSummary[];
  initialActiveWireId?: string | null;
}) {
  const [wires, setWires] = useState<WireSummary[]>(initialWires);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<WorkspaceMode>("canvas");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([assistantIntro()]);
  const [traces, setTraces] = useState<ToolTrace[]>([]);
  const [input, setInput] = useState("Build me a random AI support workflow wireframe.");
  const [loadingWireId, setLoadingWireId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareScope, setShareScope] = useState<"view" | "edit">("view");
  const [sharePin, setSharePin] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResponse | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [connectOpen, setConnectOpen] = useState(false);
  const [cloudUrl, setCloudUrl] = useState("https://reefagent-mcp-wire.vercel.app");
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [apiKeyName, setApiKeyName] = useState("Local MCP");
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialWireLoadedRef = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const validation = useMemo(
    () => (workspace ? validate(workspace.diagram) : { valid: true, issues: [] }),
    [workspace]
  );
  const svgSource = useMemo(() => (workspace ? renderToSvg(workspace.diagram) : ""), [workspace]);
  const mermaidSource = useMemo(() => (workspace ? toMermaid(workspace.diagram) : ""), [workspace]);

  const filteredWires = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return wires;
    return wires.filter((wire) => wire.title.toLowerCase().includes(needle));
  }, [query, wires]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, traces, busy, apiError]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setCloudUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (shareScope === "edit" && sharePin) setSharePin(false);
  }, [sharePin, shareScope]);

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/wires", { cache: "no-store" });
    const data = await readJsonResponse<WireListResponse>(res);
    if (res.ok && data.wires) setWires(data.wires);
  }, []);

  const loadApiKeys = useCallback(async () => {
    setApiKeyLoading(true);
    setApiKeyStatus(null);
    try {
      const res = await fetch("/api/cloud/api-keys", { cache: "no-store" });
      const data = await readJsonResponse<ApiKeyListResponse>(res);
      if (!res.ok || data.error || !data.apiKeys) {
        throw new Error(data.error ?? `Request failed with ${res.status}`);
      }
      setApiKeys(data.apiKeys);
    } catch (err) {
      setApiKeyStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setApiKeyLoading(false);
    }
  }, []);

  const openConnectGuide = useCallback(() => {
    setConnectOpen(true);
    void loadApiKeys();
  }, [loadApiKeys]);

  const createApiKey = useCallback(async () => {
    setApiKeyLoading(true);
    setApiKeyStatus(null);
    try {
      const res = await fetch("/api/cloud/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: apiKeyName })
      });
      const data = await readJsonResponse<ApiKeyCreateResponse>(res);
      if (!res.ok || data.error || !data.key || !data.apiKey) {
        throw new Error(data.error ?? `Request failed with ${res.status}`);
      }
      setCreatedApiKey(data.key);
      setApiKeys((current) => [data.apiKey!, ...current.filter((apiKey) => apiKey.id !== data.apiKey!.id)]);
      setApiKeyStatus("API key created. Copy it now.");
    } catch (err) {
      setApiKeyStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setApiKeyLoading(false);
    }
  }, [apiKeyName]);

  const revokeApiKey = useCallback(async (id: string) => {
    setApiKeyLoading(true);
    setApiKeyStatus(null);
    try {
      const res = await fetch(`/api/cloud/api-keys/${id}`, { method: "DELETE" });
      const data = await readJsonResponse<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Request failed with ${res.status}`);
      }
      setApiKeys((current) => current.filter((apiKey) => apiKey.id !== id));
      setApiKeyStatus("API key revoked.");
    } catch (err) {
      setApiKeyStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setApiKeyLoading(false);
    }
  }, []);

  const acceptWorkspace = useCallback((next: Workspace) => {
    setWorkspace(next);
    setJsonDraft(formatJson(next.diagram));
    setJsonError(null);
    setMode("canvas");
    setMessages(
      next.chatMessages.length > 0
        ? next.chatMessages.map((message) => ({ role: message.role, content: message.content }))
        : [assistantIntro()]
    );
    setApiError(null);
    setShareMessage(null);
    setShareResult(null);
    setExportMessage(null);
    setTraces([]);
    setCanvasRevision((revision) => revision + 1);
    setSaveStatus("saved");
    setWires((current) => upsertWire(current, next.wire));
    const nextPath = `/wires/${encodeURIComponent(next.wire.id)}`;
    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, "", nextPath);
    }
  }, []);

  const loadWire = useCallback(
    async (wireId: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setLoadingWireId(wireId);
      setApiError(null);
      try {
        const res = await fetch(`/api/wires/${wireId}`, { cache: "no-store" });
        const data = await readJsonResponse<WireLoadResponse>(res);
        if (!res.ok || data.error || !data.wire || !data.diagram) {
          throw new Error(data.error ?? `Request failed with ${res.status}`);
        }
        acceptWorkspace({
          wire: data.wire,
          diagram: data.diagram,
          chatMessages: data.chatMessages ?? []
        });
      } catch (err) {
        setApiError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingWireId(null);
      }
    },
    [acceptWorkspace]
  );

  useEffect(() => {
    if (initialWireLoadedRef.current || !initialActiveWireId) return;
    initialWireLoadedRef.current = true;
    void loadWire(initialActiveWireId);
  }, [initialActiveWireId, loadWire]);

  const createWire = useCallback(async () => {
    setBusy(true);
    setApiError(null);
    try {
      const res = await fetch("/api/wires", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Untitled wire" })
      });
      const data = await readJsonResponse<WireLoadResponse>(res);
      if (!res.ok || data.error || !data.wire || !data.diagram) {
        throw new Error(data.error ?? `Request failed with ${res.status}`);
      }
      acceptWorkspace({
        wire: data.wire,
        diagram: data.diagram,
        chatMessages: []
      });
      await refreshList();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [acceptWorkspace, refreshList]);

  const persistDiagram = useCallback(
    async (diagram: WireDiagram, source: "manual" | "json" | "reset") => {
      if (!workspace) return;
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/wires/${workspace.wire.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ diagram, source })
        });
        const data = await readJsonResponse<WireLoadResponse>(res);
        if (!res.ok || data.error || !data.wire || !data.diagram) {
          throw new Error(data.error ?? `Request failed with ${res.status}`);
        }
        const savedWire = data.wire;
        const savedDiagram = data.diagram;
        setWorkspace((current) =>
          current && current.wire.id === savedWire.id
            ? { ...current, wire: savedWire, diagram: savedDiagram }
            : current
        );
        setWires((current) => upsertWire(current, savedWire));
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
        setApiError(err instanceof Error ? err.message : String(err));
      }
    },
    [workspace]
  );

  const scheduleSave = useCallback(
    (diagram: WireDiagram, source: "manual" | "json" | "reset" = "manual") => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");
      saveTimerRef.current = setTimeout(() => {
        void persistDiagram(diagram, source);
      }, 650);
    },
    [persistDiagram]
  );

  const updateDiagram = useCallback(
    (diagram: WireDiagram, source: "manual" | "json" | "reset" = "manual") => {
      setWorkspace((current) => (current ? { ...current, diagram } : current));
      setJsonDraft(formatJson(diagram));
      setJsonError(null);
      scheduleSave(diagram, source);
    },
    [scheduleSave]
  );

  const applyJson = useCallback(() => {
    try {
      const parsed = parseWireDiagram(JSON.parse(jsonDraft));
      updateDiagram(parsed, "json");
      setMode("canvas");
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : String(err));
    }
  }, [jsonDraft, updateDiagram]);

  const resetWire = useCallback(() => {
    if (!workspace) return;
    updateDiagram(
      {
        version: 1,
        id: workspace.wire.id,
        title: workspace.wire.title,
        layout: "LR",
        nodes: [],
        edges: []
      },
      "reset"
    );
  }, [updateDiagram, workspace]);

  const renameWire = useCallback(
    async (title: string) => {
      if (!workspace) return;
      const trimmed = title.trim();
      if (!trimmed || trimmed === workspace.wire.title) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const renamedDiagram = { ...workspace.diagram, title: trimmed };
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/wires/${workspace.wire.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: trimmed, diagram: renamedDiagram, source: "rename" })
        });
        const data = await readJsonResponse<WireLoadResponse>(res);
        if (!res.ok || data.error || !data.wire) {
          throw new Error(data.error ?? `Request failed with ${res.status}`);
        }
        const savedDiagram = data.diagram ?? renamedDiagram;
        setWorkspace((current) => (current ? { ...current, wire: data.wire!, diagram: savedDiagram } : current));
        setJsonDraft(formatJson(savedDiagram));
        setWires((current) => upsertWire(current, data.wire!));
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
        setApiError(err instanceof Error ? err.message : String(err));
      }
    },
    [workspace]
  );

  const deleteWire = useCallback(async () => {
    if (!workspace) return;
    const wireId = workspace.wire.id;
    setBusy(true);
      try {
        const res = await fetch(`/api/wires/${wireId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await readJsonResponse<{ error?: string }>(res);
        throw new Error(data.error ?? `Request failed with ${res.status}`);
      }
      setWorkspace(null);
      window.history.replaceState({}, "", "/wires");
      setWires((current) => current.filter((wire) => wire.id !== wireId));
      setMessages([assistantIntro()]);
      setSaveStatus("idle");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [workspace]);

  const shareWire = useCallback(async () => {
    if (!workspace) return;
    setShareLoading(true);
    setShareMessage(null);
    setShareResult(null);
    try {
      const res = await fetch(`/api/wires/${workspace.wire.id}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope: shareScope, pinRevision: sharePin })
      });
      const data = await readJsonResponse<ShareResponse>(res);
      const viewUrl = data.urls?.view ?? data.previewUrl;
      if (!res.ok || data.error || !viewUrl) {
        throw new Error(data.error ?? `Request failed with ${res.status}`);
      }
      setShareResult(data);
      let copied = false;
      try {
        await navigator.clipboard?.writeText(viewUrl);
        copied = true;
      } catch {
        copied = false;
      }
      setShareMessage(copied ? "View link copied." : "Share link ready.");
    } catch (err) {
      setShareMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setShareLoading(false);
    }
  }, [sharePin, shareScope, workspace]);

  const copyExport = useCallback(async (value: string) => {
    setExportMessage(null);
    try {
      await navigator.clipboard?.writeText(value);
      setExportMessage("Copied.");
    } catch {
      setExportMessage("Copy blocked. Select the source below.");
    }
  }, []);

  const downloadExport = useCallback((format: "json" | "svg" | "mermaid") => {
    if (!workspace) return;
    const base = filenameBase(workspace.wire.title);
    if (format === "json") {
      downloadBlob(`${base}.json`, formatJson(workspace.diagram), "application/json");
    } else if (format === "svg") {
      downloadBlob(`${base}.svg`, svgSource, "image/svg+xml");
    } else {
      downloadBlob(`${base}.mmd`, mermaidSource, "text/plain");
    }
  }, [mermaidSource, svgSource, workspace]);

  const activeExportSource =
    mode === "json"
      ? jsonDraft
      : mode === "svg"
        ? svgSource
        : mode === "mermaid"
          ? mermaidSource
          : "";

  const submit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!workspace || busy) return;
      const trimmed = input.trim();
      if (!trimmed) return;

      const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
      setMessages(nextMessages);
      setTraces([]);
      setInput("");
      setBusy(true);
      setApiError(null);

      try {
        const res = await fetch(`/api/wires/${workspace.wire.id}/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: messages
          })
        });
        const data = await readJsonResponse<ChatResponse>(res);
        if (!res.ok || data.error || !data.diagram || !data.wire) {
          throw new Error(data.error ?? `Request failed with ${res.status}`);
        }
        const assistantMessage = data.message ?? "Wire diagram updated.";
        setWorkspace({
          wire: data.wire,
          diagram: data.diagram,
          chatMessages: data.chatMessages ?? []
        });
        setJsonDraft(formatJson(data.diagram));
        setTraces(data.traces ?? []);
        setCanvasRevision((revision) => revision + 1);
        setWires((current) => upsertWire(current, data.wire!));
        setMessages([...nextMessages, { role: "assistant", content: assistantMessage }]);
        setSaveStatus("saved");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setApiError(message);
        setMessages([...nextMessages, { role: "assistant", content: message }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, input, messages, workspace]
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-slate-100 text-slate-950">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <Link href="/" className="flex items-center gap-2 text-slate-950 no-underline">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-slate-950 text-white">
            <Wrench size={15} />
          </span>
          <span className="text-[15px] font-bold">Wire</span>
        </Link>
        <span className="hidden text-[13px] font-semibold text-slate-500 sm:inline">Wires</span>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <span className="hidden max-w-[220px] truncate text-[12px] font-bold text-slate-500 sm:block">
            {user.name ?? user.email}
          </span>
          <button
            type="button"
            onClick={openConnectGuide}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-bold text-slate-700 hover:border-slate-300 hover:text-slate-950"
          >
            <KeyRound size={13} />
            Connect local MCP
          </button>
          <a
            href="/api/auth/signout"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-700 no-underline hover:border-slate-300 hover:text-slate-950"
          >
            Sign out
          </a>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
          <div className="grid gap-3 border-b border-slate-200 p-3">
            <button
              type="button"
              onClick={createWire}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-[13px] font-extrabold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              New Wire
            </button>
            <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-slate-500">
              <Search size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search wires..."
                className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-slate-950 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Active Wires</div>
            <div className="grid gap-1">
              {filteredWires.map((wire) => (
                <button
                  key={wire.id}
                  type="button"
                  onClick={() => void loadWire(wire.id)}
                  className={
                    workspace?.wire.id === wire.id
                      ? "grid min-h-10 rounded-md bg-slate-950 px-2.5 py-2 text-left text-white"
                      : "grid min-h-10 rounded-md px-2.5 py-2 text-left text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[13px] font-bold">{wire.title}</span>
                    {loadingWireId === wire.id ? <Loader2 size={12} className="shrink-0 animate-spin" /> : null}
                  </span>
                  <span className={workspace?.wire.id === wire.id ? "text-[11px] text-slate-300" : "text-[11px] text-slate-400"}>
                    {wire.nodeCount} nodes
                  </span>
                </button>
              ))}
              {filteredWires.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 p-3 text-[13px] font-semibold leading-5 text-slate-500">
                  No wires found.
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        {workspace ? (
          <section className="grid min-h-0 grid-rows-[48px_minmax(0,1fr)]">
            <div className="flex h-12 min-w-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
              <input
                defaultValue={workspace.wire.title}
                key={workspace.wire.id}
                onBlur={(event) => void renameWire(event.currentTarget.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-extrabold text-slate-950 outline-none"
              />
              <SavePill status={saveStatus} />
              {shareMessage ? <span className="text-[12px] font-semibold text-slate-500">{shareMessage}</span> : null}
              {shareResult?.urls?.view ? (
                <a
                  href={shareResult.urls.view}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-[180px] truncate rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] font-bold text-slate-700 no-underline hover:border-slate-300 hover:text-slate-950"
                >
                  Open link
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-bold text-slate-700 hover:border-slate-300 hover:text-slate-950"
              >
                <Share2 size={13} />
                Share
              </button>
              <button
                type="button"
                onClick={deleteWire}
                className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                aria-label="Delete wire"
                title="Delete wire"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_390px]">
              <section className="flex min-h-0 min-w-0 flex-col border-r border-slate-200 bg-slate-100">
                <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
                  <SegmentedButton active={mode === "canvas"} onClick={() => setMode("canvas")} icon={<Play size={14} />}>
                    Canvas
                  </SegmentedButton>
                  <SegmentedButton active={mode === "json"} onClick={() => setMode("json")} icon={<FileJson size={14} />}>
                    JSON
                  </SegmentedButton>
                  <SegmentedButton active={mode === "svg"} onClick={() => setMode("svg")} icon={<ImageIcon size={14} />}>
                    SVG
                  </SegmentedButton>
                  <SegmentedButton active={mode === "mermaid"} onClick={() => setMode("mermaid")} icon={<Workflow size={14} />}>
                    Mermaid
                  </SegmentedButton>
                  {mode !== "canvas" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void copyExport(activeExportSource)}
                        className="ml-auto grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                        aria-label="Copy export"
                        title="Copy export"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadExport(mode)}
                        className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                        aria-label="Download export"
                        title="Download export"
                      >
                        <Download size={13} />
                      </button>
                      {exportMessage ? <span className="text-[12px] font-semibold text-slate-500">{exportMessage}</span> : null}
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={resetWire}
                    className={
                      mode === "canvas"
                        ? "ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-bold text-slate-700 hover:border-slate-300 hover:text-slate-950"
                        : "inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-bold text-slate-700 hover:border-slate-300 hover:text-slate-950"
                    }
                  >
                    <RefreshCcw size={13} />
                    Reset
                  </button>
                </div>

                {mode === "canvas" ? (
                  <WireProvider
                    key={`${workspace.wire.id}:${canvasRevision}`}
                    diagram={workspace.diagram}
                    onChange={(next) => updateDiagram(next, "manual")}
                  >
                    <div className="relative min-h-0 flex-1">
                      <div className="absolute left-3 top-3 z-10 grid w-[220px] gap-2">
                        <WireToolbar
                          style={{
                            padding: 8,
                            background: "rgba(255,255,255,0.96)",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8
                          }}
                        />
                        <WirePalette
                          style={{
                            maxHeight: 360,
                            overflow: "auto",
                            padding: 8,
                            background: "rgba(255,255,255,0.96)",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8
                          }}
                        />
                      </div>
                      <div className="absolute right-3 top-3 z-10 grid w-[min(320px,calc(100%-24px))] gap-2">
                        <WireValidationPanel
                          style={{
                            padding: 10,
                            background: "rgba(255,255,255,0.96)",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8
                          }}
                        />
                        <WireInspector
                          style={{
                            maxHeight: 220,
                            overflow: "auto",
                            padding: 10,
                            background: "rgba(255,255,255,0.96)",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8
                          }}
                        />
                      </div>
                      <WireCanvas
                        mode="edit"
                        fitView
                        showMiniMap
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                      />
                    </div>
                  </WireProvider>
                ) : mode === "json" ? (
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
                ) : (
                  <ExportSourcePanel mode={mode} source={activeExportSource} />
                )}
              </section>

              <aside className="flex min-h-0 min-w-0 flex-col bg-white">
                <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
                  <MessageSquare size={15} className="text-slate-500" />
                  <span className="text-[13px] font-extrabold">Chat</span>
                  <span className="ml-auto text-[12px] font-semibold text-slate-500">
                    {workspace.diagram.nodes.length} nodes
                  </span>
                </div>

                <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-auto px-4 py-3">
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
            </div>
          </section>
        ) : (
          <section className="grid min-h-0 place-items-center bg-slate-50">
            <div className="grid max-w-sm gap-3 text-center">
              <h1 className="m-0 text-[22px] font-bold tracking-tight text-slate-950">Select a wire</h1>
              <p className="m-0 text-[14px] leading-6 text-slate-500">Open an active wire from the sidebar or create a new one.</p>
              {apiError ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-[12px] font-semibold leading-5 text-red-700">
                  {apiError}
                </div>
              ) : null}
            </div>
          </section>
        )}
      </main>

      {shareOpen && workspace ? (
        <ShareDialog
          title={workspace.wire.title}
          scope={shareScope}
          pinRevision={sharePin}
          result={shareResult}
          loading={shareLoading}
          message={shareMessage}
          onScopeChange={setShareScope}
          onPinChange={setSharePin}
          onCreate={() => void shareWire()}
          onClose={() => setShareOpen(false)}
        />
      ) : null}

      {connectOpen ? (
        <ConnectMcpDialog
          user={user}
          cloudUrl={cloudUrl}
          apiKeys={apiKeys}
          apiKeyName={apiKeyName}
          createdApiKey={createdApiKey}
          status={apiKeyStatus}
          loading={apiKeyLoading}
          onNameChange={setApiKeyName}
          onCreate={() => void createApiKey()}
          onRefresh={() => void loadApiKeys()}
          onRevoke={(id) => void revokeApiKey(id)}
          onClose={() => setConnectOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ShareDialog({
  title,
  scope,
  pinRevision,
  result,
  loading,
  message,
  onScopeChange,
  onPinChange,
  onCreate,
  onClose
}: {
  title: string;
  scope: "view" | "edit";
  pinRevision: boolean;
  result: ShareResponse | null;
  loading: boolean;
  message: string | null;
  onScopeChange: (value: "view" | "edit") => void;
  onPinChange: (value: boolean) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const urls = result?.urls ?? null;
  const markdown = urls ? `![${title}](${urls.svg})` : "";
  const html = urls ? `<img src="${urls.svg}" alt="${title.replaceAll("\"", "&quot;")}" />` : "";
  const status = copyStatus ?? message;

  const copy = async (label: string, value: string | null | undefined) => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus("Copy blocked. Select the link manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-3 sm:p-6">
      <section className="grid max-h-[calc(100dvh-32px)] w-[min(760px,100%)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex min-h-14 items-center gap-3 border-b border-slate-200 px-4">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-950 text-white">
            <Share2 size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 truncate text-[16px] font-extrabold text-slate-950">Share &quot;{title}&quot;</h2>
            <div className="mt-0.5 text-[12px] font-semibold text-slate-500">Public links are token-scoped.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-950"
            aria-label="Close"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 overflow-auto bg-slate-50 p-4">
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onScopeChange("view")}
                  className={scope === "view"
                    ? "rounded-md bg-slate-950 px-3 py-2 text-[12px] font-extrabold text-white"
                    : "rounded-md border border-slate-200 px-3 py-2 text-[12px] font-bold text-slate-600 hover:border-slate-300 hover:text-slate-950"}
                >
                  View only
                </button>
                <button
                  type="button"
                  onClick={() => onScopeChange("edit")}
                  className={scope === "edit"
                    ? "rounded-md bg-slate-950 px-3 py-2 text-[12px] font-extrabold text-white"
                    : "rounded-md border border-slate-200 px-3 py-2 text-[12px] font-bold text-slate-600 hover:border-slate-300 hover:text-slate-950"}
                >
                  Can edit
                </button>
              </div>
              <label className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={pinRevision}
                  disabled={scope === "edit"}
                  onChange={(event) => onPinChange(event.currentTarget.checked)}
                />
                Pin to current revision
              </label>
              <button
                type="button"
                onClick={onCreate}
                disabled={loading}
                className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-slate-950 px-3 text-[13px] font-extrabold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                New link
              </button>
            </div>

            {urls ? (
              <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <ShareRow label="Link" value={urls.view} onCopy={() => void copy("Link", urls.view)} />
                {urls.edit ? <ShareRow label="Edit" value={urls.edit} onCopy={() => void copy("Edit link", urls.edit)} /> : null}
                <ShareRow label="SVG" value={urls.svg} onCopy={() => void copy("SVG", urls.svg)} />
                <ShareRow label="PNG" value={urls.png} onCopy={() => void copy("PNG", urls.png)} />
                <ShareRow label="JSON" value={urls.json} onCopy={() => void copy("JSON", urls.json)} />
                <ShareRow label="Mermaid" value={urls.mermaid} onCopy={() => void copy("Mermaid", urls.mermaid)} />
                <ShareRow label="Markdown" value={markdown} onCopy={() => void copy("Markdown", markdown)} />
                <ShareRow label="HTML" value={html} onCopy={() => void copy("HTML", html)} />
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 bg-white p-4 text-[13px] font-semibold text-slate-500">
                Create a link to populate public view and embed URLs.
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-11 items-center gap-2 border-t border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-500">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
          <span className="min-w-0 truncate">{status ?? "View tokens and edit tokens are separate secrets."}</span>
        </div>
      </section>
    </div>
  );
}

function ShareRow({
  label,
  value,
  onCopy
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="grid min-h-11 grid-cols-[86px_minmax(0,1fr)_40px] items-center gap-2 border-b border-slate-100 px-3 last:border-b-0">
      <div className="text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{label}</div>
      <code className="truncate rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] font-semibold text-slate-700">{value}</code>
      <button
        type="button"
        onClick={onCopy}
        className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-950"
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
      >
        <Copy size={13} />
      </button>
    </div>
  );
}

function ConnectMcpDialog({
  user,
  cloudUrl,
  apiKeys,
  apiKeyName,
  createdApiKey,
  status,
  loading,
  onNameChange,
  onCreate,
  onRefresh,
  onRevoke,
  onClose
}: {
  user: UserInfo;
  cloudUrl: string;
  apiKeys: ApiKeySummary[];
  apiKeyName: string;
  createdApiKey: string | null;
  status: string | null;
  loading: boolean;
  onNameChange: (value: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
  onRevoke: (id: string) => void;
  onClose: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [manualApiKey, setManualApiKey] = useState("");
  const trimmedManualApiKey = manualApiKey.trim();
  const keyForGuide = createdApiKey ?? trimmedManualApiKey;
  const guideKey = keyForGuide || "GENERATE_OR_PASTE_API_KEY";
  const hasGuideKey = keyForGuide.length > 0;
  const mcpJson = JSON.stringify(
    {
      mcpServers: {
        wire: {
          command: "npx",
          args: ["-y", "@aigentive/wire-mcp@latest"],
          env: {
            WIRE_CLOUD_URL: cloudUrl,
            WIRE_CLOUD_API_KEY: guideKey
          }
        }
      }
    },
    null,
    2
  );
  const claudeCommand = [
    "claude mcp add wire",
    `--env WIRE_CLOUD_URL=${shellQuote(cloudUrl)}`,
    `--env WIRE_CLOUD_API_KEY=${shellQuote(guideKey)}`,
    "-- npx -y @aigentive/wire-mcp@latest"
  ].join(" ");
  const httpCommand = [
    `WIRE_CLOUD_URL=${shellQuote(cloudUrl)}`,
    `WIRE_CLOUD_API_KEY=${shellQuote(guideKey)}`,
    "npx -y @aigentive/wire-mcp@latest --http"
  ].join(" ");
  const smokeTest = [
    `curl -sS ${shellQuote(`${cloudUrl}/api/cloud/me`)}`,
    `  -H ${shellQuote(`Authorization: Bearer ${guideKey}`)}`
  ].join(" \\\n");
  const localHealthTest = "curl -sS http://127.0.0.1:3860/health";
  const statusMessage = copyStatus ?? status;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus("Copy blocked. Select the source and copy it manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-3 sm:p-6">
      <section className="grid max-h-[calc(100dvh-32px)] w-[min(1120px,100%)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-4 sm:px-5">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-950 text-white">
            <Terminal size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-[18px] font-extrabold text-slate-950">Connect local MCP</h2>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-slate-500">
              <span className="truncate">{user.email}</span>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span className="truncate font-mono">{cloudUrl}</span>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span className="truncate font-mono">@aigentive/wire-mcp@latest</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-950"
            aria-label="Close"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 overflow-auto bg-slate-50 p-3 sm:p-4">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="grid min-w-0 content-start gap-3">
              <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-950 text-[12px] font-extrabold text-white">1</span>
                  <div className="text-[12px] font-extrabold uppercase tracking-wide text-slate-500">Generate API Key</div>
                </div>
                <label className="mb-2 block text-[12px] font-bold text-slate-600">Name</label>
                <input
                  value={apiKeyName}
                  onChange={(event) => onNameChange(event.target.value)}
                  className="mb-3 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-950 outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={onCreate}
                  disabled={loading}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-[13px] font-extrabold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Generate Key
                </button>
                <p className="m-0 mt-2 text-[12px] font-semibold leading-5 text-slate-500">
                  Keys allow local MCP clients to list, create, edit, and delete wires in this account.
                </p>
              </div>

              {createdApiKey ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <Check size={14} className="text-emerald-700" />
                    <div className="text-[12px] font-extrabold text-emerald-800">One-time key</div>
                    <button
                      type="button"
                      onClick={() => void copy("API key", createdApiKey)}
                      className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2.5 text-[12px] font-bold text-emerald-800 hover:border-emerald-300"
                    >
                      <Copy size={13} />
                      Copy
                    </button>
                  </div>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-white p-2 font-mono text-[11px] leading-5 text-slate-950">{createdApiKey}</pre>
                  <p className="m-0 mt-2 text-[12px] font-semibold leading-5 text-emerald-800">Store it locally now. The full secret is not shown again.</p>
                </div>
              ) : null}

              <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">Use Saved Key</div>
                <input
                  value={manualApiKey}
                  onChange={(event) => setManualApiKey(event.target.value)}
                  placeholder="Paste an existing wire_sk_live_ key"
                  spellCheck={false}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-[12px] font-medium text-slate-950 outline-none focus:border-blue-400"
                />
                <p className="m-0 mt-2 text-[12px] font-semibold leading-5 text-slate-500">
                  Existing keys cannot be revealed again. Paste a saved key here or revoke it and generate a new one.
                </p>
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex h-10 items-center gap-2 border-b border-slate-200 px-3">
                  <div className="text-[12px] font-extrabold uppercase tracking-wide text-slate-500">Active Keys</div>
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    className="ml-auto text-[12px] font-bold text-slate-500 hover:text-slate-950"
                  >
                    Refresh
                  </button>
                </div>
                <div className="grid gap-2 p-3">
                  {apiKeys.length > 0 ? apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="rounded-md border border-slate-200 p-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-extrabold text-slate-950">{apiKey.name}</div>
                          <div className="truncate text-[11px] font-semibold text-slate-500">{apiKey.prefix}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRevoke(apiKey.id)}
                          disabled={loading}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          Revoke
                        </button>
                      </div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-400">
                        {apiKey.scopes.join(", ")} - last used {apiKey.lastUsedAt ? formatShortDate(apiKey.lastUsedAt) : "never"}
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-md border border-dashed border-slate-200 p-3 text-[12px] font-semibold leading-5 text-slate-500">
                      No active API keys.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid min-w-0 content-start gap-3">
              <div className="grid min-w-0 gap-3 md:grid-cols-3">
                <GuideStep index={2} title="Use npm latest" />
                <GuideStep index={3} title="Restart the client" />
                <GuideStep index={4} title="Cloud previews" />
              </div>

              <div className="flex min-w-0 gap-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-[12px] font-semibold leading-5 text-blue-950">
                <ImageIcon size={16} className="mt-0.5 shrink-0 text-blue-700" />
                <div className="min-w-0">
                  <div className="font-extrabold">Cloud rendering is enabled by this config.</div>
                  <div className="text-blue-800">
                    With <span className="font-mono">WIRE_CLOUD_URL</span>, <span className="font-mono">render_preview</span> returns a Wire Cloud URL. <span className="font-mono">render_svg</span> and <span className="font-mono">render_png</span> return inline assets from the MCP server.
                  </div>
                </div>
              </div>

              <CodeBlock
                title="Claude Code"
                subtitle="Run in a terminal, then restart Claude Code or open a new session."
                body={claudeCommand}
                disabled={!hasGuideKey}
                onCopy={() => void copy("Claude command", claudeCommand)}
              />
              <CodeBlock
                title="Local HTTP server"
                subtitle="Only for localhost:3860. Stop any existing local-only server before starting this."
                body={httpCommand}
                disabled={!hasGuideKey}
                onCopy={() => void copy("HTTP server command", httpCommand)}
              />
              <CodeBlock
                title="Codex or repo .mcp.json"
                subtitle="Use this when a project reads MCP servers from a JSON config."
                body={mcpJson}
                disabled={!hasGuideKey}
                onCopy={() => void copy(".mcp.json", mcpJson)}
              />
              <CodeBlock
                title="Cloud API smoke test"
                subtitle="Verifies the key can authenticate against the cloud API."
                body={smokeTest}
                disabled={!hasGuideKey}
                onCopy={() => void copy("Smoke test", smokeTest)}
              />
              <CodeBlock
                title="Local health check"
                subtitle="After starting --http with cloud env, health should show cloud.enabled true."
                body={localHealthTest}
                onCopy={() => void copy("Health check", localHealthTest)}
              />
            </section>
          </div>
        </div>

        <div className="flex min-h-12 items-center gap-2 border-t border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-500">
          {loading ? <Loader2 size={14} className="animate-spin" /> : statusMessage ? <Check size={14} className="text-emerald-600" /> : <KeyRound size={14} />}
          <span className="min-w-0 truncate">
            {statusMessage ?? (hasGuideKey
              ? "Copy a client config, then restart the MCP client. Existing Claude Code sessions will not gain new MCP tools automatically."
              : "Generate or paste an API key before running the commands. Do not use the placeholder key.")}
          </span>
        </div>
      </section>
    </div>
  );
}

function GuideStep({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[12px] font-extrabold text-slate-600">
        {index}
      </span>
      <span className="min-w-0 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{title}</span>
    </div>
  );
}

function CodeBlock({
  title,
  subtitle,
  body,
  disabled = false,
  onCopy
}: {
  title: string;
  subtitle: string;
  body: string;
  disabled?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-12 items-center gap-3 border-b border-slate-200 px-3">
        <div className="min-w-0 flex-1 py-2">
          <div className="truncate text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{title}</div>
          <div className="truncate text-[12px] font-semibold text-slate-400">{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          disabled={disabled}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
          aria-label={`Copy ${title}`}
          title={disabled ? "Generate or paste an API key first" : `Copy ${title}`}
        >
          <Copy size={13} />
        </button>
      </div>
      <pre className="max-h-48 min-w-0 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-100">{body}</pre>
    </div>
  );
}

function SavePill({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-50 px-2.5 text-[12px] font-bold text-blue-700">
        <Loader2 size={13} className="animate-spin" />
        Saving
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-50 px-2.5 text-[12px] font-bold text-red-700">
        <AlertCircle size={13} />
        Error
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 text-[12px] font-bold text-emerald-700">
        <Check size={13} />
        Saved
      </span>
    );
  }
  return null;
}

function SegmentedButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
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
          <MessageSquare size={12} />
          {assistant ? "Assistant" : "User"}
        </div>
        {message.content}
      </div>
    </div>
  );
}

function assistantIntro(): ChatMessage {
  return {
    role: "assistant",
    content: "Send a prompt and I will update the Wire JSON through MCP tools."
  };
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

function ExportSourcePanel({ mode, source }: { mode: "svg" | "mermaid"; source: string }) {
  const label = mode === "svg" ? "SVG" : "Mermaid";
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-950">
      {mode === "svg" ? (
        <div className="grid min-h-0 flex-[1.2] place-items-center overflow-auto border-b border-slate-800 bg-white p-4">
          <div className="max-h-full max-w-full [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: source }} />
        </div>
      ) : null}
      <div className="flex h-9 shrink-0 items-center border-b border-slate-800 px-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
        {label} Source
      </div>
      <textarea
        value={source}
        readOnly
        spellCheck={false}
        className="min-h-0 flex-1 resize-none border-0 bg-slate-950 p-4 font-mono text-[12px] leading-5 text-slate-100 outline-none"
      />
    </div>
  );
}

function formatJson(diagram: WireDiagram): string {
  return JSON.stringify(diagram, null, 2);
}

function downloadBlob(filename: string, body: string, type: string): void {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function filenameBase(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "wire";
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function formatShortDate(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
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

function upsertWire(wires: WireSummary[], next: WireSummary): WireSummary[] {
  return [next, ...wires.filter((wire) => wire.id !== next.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
