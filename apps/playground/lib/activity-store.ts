import { randomUUID } from "node:crypto";
import { getDbClient, shouldUseDatabaseStore } from "@/lib/db/client";
import { NANO_USD_PER_USD } from "@/lib/llm-cost";

type ActivityUser = {
  key: string;
  email: string;
  name: string | null;
  image: string | null;
};

type ActivityWire = {
  id: string;
  title: string;
  currentToken: string;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastClientMutationId?: number;
};

type ActivityWireVersion = {
  id: string;
  token: string;
  source: string;
  summary: string | null;
  createdAt: string;
};

export type ActivityChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  costUsd?: number | null;
  costNanoUsd?: number | null;
  inputTokens?: number | null;
  cachedInputTokens?: number | null;
  outputTokens?: number | null;
  reasoningTokens?: number | null;
  totalTokens?: number | null;
  createdAt?: string;
};

export async function recordAuthenticatedUser(
  user: ActivityUser,
  options: { source: "session" | "api-key" | "wire-store" | "playground-chat" }
): Promise<void> {
  await recordActivity("recordAuthenticatedUser", async () => {
    const db = await getDbClient();
    const now = new Date().toISOString();
    await db.execute({
      sql: `
INSERT INTO wire_users (user_key, email, name, image, first_seen_at, last_seen_at, seen_count)
VALUES (?, ?, ?, ?, ?, ?, 1)
ON CONFLICT(user_key) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  image = excluded.image,
  last_seen_at = excluded.last_seen_at,
  seen_count = wire_users.seen_count + 1
`,
      args: [user.key, user.email, user.name, user.image, now, now]
    });
    await db.execute({
      sql: `
INSERT INTO wire_user_events (id, user_key, event_type, metadata_json, created_at)
VALUES (?, ?, 'authenticated', ?, ?)
`,
      args: [randomUUID(), user.key, JSON.stringify({ source: options.source }), now]
    });
  });
}

export async function recordWireState(options: {
  user: ActivityUser;
  wire: ActivityWire;
  version?: ActivityWireVersion | null;
  chatMessages?: ActivityChatMessage[];
}): Promise<void> {
  await recordActivity("recordWireState", async () => {
    const db = await getDbClient();
    await upsertUser(db, options.user);
    await db.execute({
      sql: `
INSERT INTO wire_documents (
  user_key,
  wire_id,
  title,
  current_token,
  node_count,
  is_deleted,
  last_client_mutation_id,
  created_at,
  updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(user_key, wire_id) DO UPDATE SET
  title = excluded.title,
  current_token = excluded.current_token,
  node_count = excluded.node_count,
  is_deleted = excluded.is_deleted,
  last_client_mutation_id = excluded.last_client_mutation_id,
  updated_at = excluded.updated_at
`,
      args: [
        options.user.key,
        options.wire.id,
        options.wire.title,
        options.wire.currentToken,
        safeInteger(options.wire.nodeCount),
        options.wire.isDeleted ? 1 : 0,
        typeof options.wire.lastClientMutationId === "number" ? options.wire.lastClientMutationId : null,
        options.wire.createdAt,
        options.wire.updatedAt
      ]
    });

    if (options.version) {
      await db.execute({
        sql: `
INSERT OR IGNORE INTO wire_versions (id, user_key, wire_id, token, source, summary, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`,
        args: [
          options.version.id,
          options.user.key,
          options.wire.id,
          options.version.token,
          options.version.source,
          options.version.summary,
          options.version.createdAt
        ]
      });
    }

    if (options.chatMessages?.length) {
      await insertChatMessages(db, {
        userKey: options.user.key,
        actorKey: null,
        wireId: options.wire.id,
        surface: "wires",
        messages: options.chatMessages
      });
    }
  });
}

export async function recordPlaygroundChatMessages(options: {
  user?: ActivityUser | null;
  actorKey?: string | null;
  messages: ActivityChatMessage[];
}): Promise<void> {
  await recordActivity("recordPlaygroundChatMessages", async () => {
    const db = await getDbClient();
    if (options.user) await upsertUser(db, options.user);
    await insertChatMessages(db, {
      userKey: options.user?.key ?? null,
      actorKey: options.actorKey ?? null,
      wireId: null,
      surface: "playground",
      messages: options.messages
    });
  });
}

async function recordActivity(label: string, write: () => Promise<void>): Promise<void> {
  if (!shouldUseDatabaseStore()) return;
  try {
    await write();
  } catch (err) {
    console.warn(`[wire-activity] ${label} failed`, err);
  }
}

async function upsertUser(db: Awaited<ReturnType<typeof getDbClient>>, user: ActivityUser): Promise<void> {
  const now = new Date().toISOString();
  await db.execute({
    sql: `
INSERT INTO wire_users (user_key, email, name, image, first_seen_at, last_seen_at, seen_count)
VALUES (?, ?, ?, ?, ?, ?, 1)
ON CONFLICT(user_key) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  image = excluded.image,
  last_seen_at = excluded.last_seen_at
`,
    args: [user.key, user.email, user.name, user.image, now, now]
  });
}

async function insertChatMessages(
  db: Awaited<ReturnType<typeof getDbClient>>,
  options: {
    userKey: string | null;
    actorKey: string | null;
    wireId: string | null;
    surface: "wires" | "playground";
    messages: ActivityChatMessage[];
  }
): Promise<void> {
  for (const message of options.messages) {
    const content = message.content.trim();
    if (!content) continue;
    await db.execute({
      sql: `
INSERT OR IGNORE INTO wire_chat_messages (
  id,
  user_key,
  actor_key,
  wire_id,
  surface,
  role,
  content,
  model,
  cost_usd,
  cost_nano_usd,
  input_tokens,
  cached_input_tokens,
  output_tokens,
  reasoning_tokens,
  total_tokens,
  created_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      args: [
        message.id ?? randomUUID(),
        options.userKey,
        options.actorKey,
        options.wireId,
        options.surface,
        message.role,
        content,
        message.model ?? null,
        safeNullableCostUsd(message.costUsd, message.costNanoUsd),
        safeNullableInteger(message.costNanoUsd),
        safeNullableInteger(message.inputTokens),
        safeNullableInteger(message.cachedInputTokens),
        safeNullableInteger(message.outputTokens),
        safeNullableInteger(message.reasoningTokens),
        safeNullableInteger(message.totalTokens),
        message.createdAt ?? new Date().toISOString()
      ]
    });
  }
}

function safeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function safeNullableInteger(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : null;
}

function safeNullableCostUsd(costUsd: number | null | undefined, costNanoUsd: number | null | undefined): number | null {
  if (typeof costUsd === "number" && Number.isFinite(costUsd)) return costUsd;
  const nanoUsd = safeNullableInteger(costNanoUsd);
  return nanoUsd === null ? null : nanoUsd / NANO_USD_PER_USD;
}
