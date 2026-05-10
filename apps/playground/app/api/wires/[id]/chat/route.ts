import type { NextRequest } from "next/server";
import { POST as runPlaygroundChat } from "@/app/api/playground/chat/route";
import { requireCurrentUser } from "@/lib/current-user";
import { getUserOpenAIKey } from "@/lib/user-openai-key-store";
import {
  loadUserWire,
  makeChatMessage,
  saveUserWire,
  toSummary,
  WireNotFoundError,
  type StoredChatUsage
} from "@/lib/wires-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ChatResponseBody = {
  diagram?: unknown;
  message?: unknown;
  model?: unknown;
  costUsd?: unknown;
  validation?: unknown;
  traces?: unknown;
  error?: unknown;
  usage?: unknown;
};

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Body must be an object." }, { status: 400 });
  }

  const payload = body as { message?: unknown; history?: unknown };
  if (typeof payload.message !== "string" || payload.message.trim().length === 0) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const loaded = await loadUserWire(user, id);
    if (!loaded) return Response.json({ error: "Wire not found." }, { status: 404 });

    const storedOpenAIKey = await getUserOpenAIKey(user);
    if (!storedOpenAIKey) {
      return Response.json(
        {
          error: "Add your OpenAI API key in the chat sidebar to use the /wires LLM.",
          code: "openai-key-required"
        },
        { status: 428 }
      );
    }

    const history = Array.isArray(payload.history)
      ? payload.history
      : loaded.wire.chatMessages.map((message) => ({
          role: message.role,
          content: message.content
        }));

    const upstream = await runPlaygroundChat(
      new Request("http://wire.local/api/playground/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-wire-user-key": user.key,
          "x-wire-user-email": user.email,
          "x-wire-chat-surface": "wires"
        },
        body: JSON.stringify({
          message: payload.message,
          diagram: loaded.diagram,
          history
        })
      }) as NextRequest
    );

    const data = (await upstream.json()) as ChatResponseBody;
    if (!upstream.ok || data.error) {
      return Response.json(data, { status: upstream.status });
    }
    if (!data.diagram) {
      return Response.json({ ...data, error: "Chat did not return a diagram." }, { status: 502 });
    }

    const assistantMessage =
      typeof data.message === "string" && data.message.trim().length > 0
        ? data.message.trim()
        : "Wire diagram updated.";
    const model = typeof data.model === "string" ? data.model : null;
    const costUsd = typeof data.costUsd === "number" ? data.costUsd : null;
    const usage = parseUsage(data.usage);
    const saved = await saveUserWire({
      user,
      wireId: id,
      diagram: data.diagram,
      source: "chat",
      summary: assistantMessage,
      chatMessages: [
        makeChatMessage("user", payload.message.trim()),
        makeChatMessage("assistant", assistantMessage, { model, costUsd, usage })
      ]
    });

    return Response.json({
      ...data,
      diagram: saved.diagram,
      wire: toSummary(saved.wire),
      validation: saved.validation,
      chatMessages: saved.wire.chatMessages
    });
  } catch (err) {
    if (err instanceof WireNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

function parseUsage(value: unknown): StoredChatUsage | null {
  if (!value || typeof value !== "object") return null;
  const usage = value as Partial<Record<keyof StoredChatUsage, unknown>>;
  return {
    inputTokens: nullableInteger(usage.inputTokens),
    cachedInputTokens: nullableInteger(usage.cachedInputTokens),
    outputTokens: nullableInteger(usage.outputTokens),
    reasoningTokens: nullableInteger(usage.reasoningTokens),
    totalTokens: nullableInteger(usage.totalTokens)
  };
}

function nullableInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : null;
}
