import {
  parseWireDiagram,
  validate,
  type ValidationResult,
  type WireDiagram,
  type WireNode
} from "@aigentive/wire-core";
import { WIRE_AGENT_GUIDE } from "@aigentive/wire-mcp/dist/agent-guide.js";
import type { NextRequest } from "next/server";
import { recordPlaygroundChatMessages } from "@/lib/activity-store";
import { getCurrentUser, type CurrentUser } from "@/lib/current-user";
import {
  IP_QUOTA_LIMIT,
  USER_QUOTA_LIMIT,
  hashIp,
  incrementIpQuota,
  incrementUserQuota,
  readIpQuota,
  readUserQuota,
  resolveClientIp
} from "@/lib/ip-quota-store";
import { getUserOpenAIKey } from "@/lib/user-openai-key-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type ResponseOutputItem = {
  type?: string;
  name?: string;
  arguments?: string;
  call_id?: string;
  id?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type OpenAIResponse = {
  id?: string;
  output?: ResponseOutputItem[];
  output_text?: string;
  usage?: RawUsage;
  model?: string;
};

type ResponseInputItem =
  | { role: string; content: string }
  | { type: "function_call_output"; call_id: string; output: string };

type RawUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
};

type Usage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

const MODEL_PRICING: Record<string, { input: number; cached?: number; output: number }> = {
  "gpt-5.5":      { input: 5    / 1_000_000,                                output: 30  / 1_000_000 },
  "gpt-5.4":      { input: 2.5  / 1_000_000,                                output: 15  / 1_000_000 },
  "gpt-5.4-mini": { input: 0.75 / 1_000_000, cached: 0.075 / 1_000_000,     output: 4.5 / 1_000_000 }
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const SYSTEM_PROMPT = `${WIRE_AGENT_GUIDE}

You are powering the hosted /playground chat. The user edits a Wire diagram on the
left canvas and then asks for changes in the right chat.

Expected outcome:
- Produce one complete canonical WireDiagram JSON object.
- Preserve useful existing node ids, positions, sizes, labels, and manual edits unless the user asks to replace them.
- Use only Wire schema fields. Never emit React Flow JSON, SVG, Markdown diagrams, or prose as the primary artifact.
- Valid tones are only default, success, warning, error, info, ai. Never use danger.
- Prefer clear workflow-wireframe diagrams with 4-8 nodes unless the user asks for more detail.
- Every non-group workflow node renders as a card. Use node.kind for the card category, node.title for the card header, and node.description for body copy.
- For tool/integration cards, use kind: "tool" and put the tool/function/MCP name in ref. Do not create fake "card" nodes or emit HTML/SVG cards.
- Use node.data.card only for extra serializable card content: title, description, badges, meta, progress, and footer.
- First use MCP tool mcp_wire_validate_diagram with diagram_json set to JSON.stringify(the full updated diagram).
- If validation returns invalid, fix the graph and call mcp_wire_validate_diagram again.
- Only after validation returns valid should you call mcp_wire_save_diagram exactly once with the same complete canonical diagram.
- For build, improve, iterate, or update requests, the saved graph must visibly change nodes, edges, layout, or node content. Validation will reject no-op graph saves.
- Keep summary short. Do not put the diagram JSON in summary.
- The final visible chat answer should be short and confirm success.

STYLING RULES — when the user asks to change colors:
- Preferred: set "tone" on each node. Tones map to themed colors:
    default = slate/gray, success = green, warning = yellow/amber, error = red, info = blue, ai = purple.
    "Make it yellow" → set tone: "warning" on the relevant nodes.
    "Make it red"    → tone: "error".  "Make it green" → tone: "success".
    "Make it blue"   → tone: "info".   "Make it purple/AI" → tone: "ai".
- For exact custom colors, set "style" on the node: { "fill": "#fde68a", "stroke": "#ca8a04", "textColor": "#0f172a" }.
  "fill" is the background, "stroke" is the border, "textColor" is the text. All accept any CSS color.
- If the user asks for a global color change ("all yellow", "everything blue"), apply it to every applicable node in the diagram, not just one.
- Do not invent claims in the summary. If the diagram_json you emit doesn't actually carry the requested change, the user will see no change. Always mutate the JSON to match what your summary says.

WIRING RULES (validation will reject anything that breaks these):
- Node ids and branch names must match the slug pattern /^[A-Za-z0-9_-]+$/.
  Letters, digits, hyphen, underscore only. No spaces, dots, colons, slashes, emoji, or accented characters.
  Valid examples: "trigger", "classify_intent", "route", "notify-sales", "step1".
  Invalid examples: "user input", "Customer Support", "trigger:hook", "team.sales", "router/branch", "🚀launch".
- Connect nodes by setting the target node's "from" field. Prefer this over the top-level "edges" array.
    - A -> B means B has "from": "A". Do not put "to", "next", "target", or "connectsTo" on nodes.
    - Single source: "from": "classify"
    - Fan-in (multiple sources): "from": ["validate", "review"]
    - From a condition branch: "from": "route.sales" (one dot only — pattern is <nodeId>.<branch>, both slug-safe)
- Use the "edges" array only when you need a label, branch, fromHandle/toHandle, tone, or routing.
  Each edge: { "from": "<nodeId>" or "<nodeId>.<branch>", "to": "<nodeId>" } — both must be slug-safe.
- Every "from" reference must point to a node id that actually exists in this diagram.
- Every condition node must declare "branches" (e.g. ["yes", "no"]).
  When you reference a branch via "<nodeId>.<branch>", the branch name must appear in that condition node's "branches".
- Do not leave orphan nodes: every non-trigger node should be reachable from a trigger via a chain of "from" references.
- Keep ids short and descriptive (snake_case or kebab-case). Do not reuse the same id for two nodes.
- No duplicate connections. The same source-and-target pair must appear only once.
    - If node B already has \`from: "A"\`, do not also add an explicit edge \`{ from: "A", to: "B" }\`. Pick one.
    - For condition branches, distinct branches to the same target are allowed (e.g. "route.yes" and "route.no" both pointing to "notify"), but the exact same (source, branch, target) triple must not repeat.
    - Validation rejects with code \`edge.duplicate-connection\`.`;

const VALIDATE_DIAGRAM_TOOL = {
  type: "function",
  name: "mcp_wire_validate_diagram",
  description:
    "Wire MCP validate. Checks one complete canonical WireDiagram JSON string and returns validation issues before saving.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["diagram_json"],
    properties: {
      diagram_json: {
        type: "string",
        description: "JSON.stringify output for one complete canonical WireDiagram to validate before saving."
      }
    }
  }
};

const SAVE_DIAGRAM_TOOL = {
  type: "function",
  name: "mcp_wire_save_diagram",
  description:
    "Wire MCP save_diagram. Accepts one complete canonical WireDiagram JSON string and a short success summary.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["diagram_json", "summary"],
    properties: {
      summary: {
        type: "string",
        description: "Short success message for the user. Do not include the diagram JSON here."
      },
      diagram_json: {
        type: "string",
        description: "JSON.stringify output for one complete canonical WireDiagram. Must include version, layout, nodes, and edges."
      }
    }
  }
};

const NODE_KINDS = [
  "trigger",
  "action",
  "ai",
  "tool",
  "condition",
  "human",
  "memory",
  "retrieval",
  "guardrail",
  "end",
  "note",
  "group"
] as const satisfies Array<WireNode["kind"]>;

const NODE_KIND_SET = new Set<string>(NODE_KINDS);

const NODE_KIND_ALIASES: Record<string, WireNode["kind"]> = {
  tr: "trigger",
  start: "trigger",
  input: "trigger",
  user_prompt: "trigger",
  prompt: "trigger",
  webhook: "trigger",
  event: "trigger",

  ac: "action",
  act: "action",
  output: "action",
  notify: "action",
  notification: "action",
  reply: "action",
  send: "action",
  email: "action",

  llm: "ai",
  model: "ai",
  agent: "ai",
  assistant: "ai",
  classifier: "ai",
  generator: "ai",

  tl: "tool",
  function: "tool",
  api: "tool",
  mcp: "tool",
  integration: "tool",

  if: "condition",
  decision: "condition",
  router: "condition",
  route: "condition",
  branch: "condition",
  check: "condition",

  hu: "human",
  human_review: "human",
  approval: "human",
  reviewer: "human",
  review: "human",
  escalation: "human",

  me: "memory",
  store: "memory",
  storage: "memory",
  cache: "memory",

  re: "retrieval",
  retrieve: "retrieval",
  search: "retrieval",
  knowledge: "retrieval",
  kb: "retrieval",
  vector_search: "retrieval",

  gu: "guardrail",
  guard: "guardrail",
  safety: "guardrail",
  policy: "guardrail",
  moderation: "guardrail",

  en: "end",
  finish: "end",
  done: "end",
  close: "end",
  resolved: "end",

  no: "note",
  annotation: "note",
  comment: "note",

  gr: "group",
  container: "group",
  section: "group"
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    return await handlePost(req);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
}

async function handlePost(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body must be JSON." }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Body must be an object." }, 400);
  }

  const payload = body as {
    message?: unknown;
    diagram?: unknown;
    history?: unknown;
  };
  if (typeof payload.message !== "string" || payload.message.trim().length === 0) {
    return jsonResponse({ error: "Message is required." }, 400);
  }

  let currentDiagram: WireDiagram;
  try {
    currentDiagram = parseWireDiagram(payload.diagram);
  } catch (err) {
    return jsonResponse(
      { error: `Current diagram is not valid Wire JSON: ${err instanceof Error ? err.message : String(err)}` },
      422
    );
  }

  const sessionUser = await resolveSessionUser(req.headers);
  let storedKey: string | null = null;
  if (sessionUser) {
    storedKey = await getUserOpenAIKey(sessionUser);
  }

  const apiKey = storedKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: "OPENAI_API_KEY is not set on the playground server." },
      503
    );
  }

  const usingStoredKey = storedKey !== null;
  const ipHash = !usingStoredKey && !sessionUser ? hashIp(resolveClientIp(req.headers)) : null;
  const userQuotaKey = !usingStoredKey && sessionUser ? sessionUser.key : null;

  if (ipHash) {
    const existing = await readIpQuota(ipHash);
    if (existing && existing.count >= IP_QUOTA_LIMIT) {
      return jsonResponse(
        {
          error: `Free chat limit reached (${IP_QUOTA_LIMIT} messages). Sign in to keep going.`,
          code: "ip-quota-exceeded",
          limit: IP_QUOTA_LIMIT
        },
        429
      );
    }
  }

  if (userQuotaKey) {
    const existing = await readUserQuota(userQuotaKey);
    if (existing && existing.count >= USER_QUOTA_LIMIT) {
      return jsonResponse(
        {
          error: `Free chat limit reached (${USER_QUOTA_LIMIT} messages). Add your own OpenAI key to keep going.`,
          code: "user-quota-exceeded",
          limit: USER_QUOTA_LIMIT
        },
        429
      );
    }
  }

  const traces: ToolTrace[] = [];
  traces.push(runGetDiagramJsonTrace(currentDiagram));

  const requestedModel = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
  let run: {
    saved: { diagram: WireDiagram; validation: ValidationResult; summary?: unknown };
    response: OpenAIResponse;
    usage: Usage | null;
  };
  try {
    run = await runValidatedDiagramAgent({
      apiKey,
      model: requestedModel,
      input: buildInput(payload.message, currentDiagram, payload.history),
      maxOutputTokens: resolveMaxOutputTokens(),
      currentDiagram,
      traces
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err), traces },
      502
    );
  }

  const responseModel = typeof run.response.model === "string" ? run.response.model : requestedModel;
  const usage = run.usage;
  const costUsd = usage ? computeCost(usage, responseModel) : null;

  if (ipHash) {
    try {
      await incrementIpQuota(ipHash);
    } catch {
      // Counter best-effort; do not fail the chat response.
    }
  }
  if (userQuotaKey) {
    try {
      await incrementUserQuota(userQuotaKey);
    } catch {
      // Counter best-effort; do not fail the chat response.
    }
  }

  const assistantMessage =
    typeof run.saved.summary === "string" && run.saved.summary.trim().length > 0
      ? run.saved.summary.trim()
      : "Wire diagram updated.";

  if (req.headers.get("x-wire-chat-surface") !== "wires") {
    await recordPlaygroundChatMessages({
      user: sessionUser,
      actorKey: sessionUser ? null : ipHash ? `ip:${ipHash}` : null,
      messages: [
        { role: "user", content: payload.message.trim() },
        { role: "assistant", content: assistantMessage, model: responseModel, costUsd }
      ]
    });
  }

  return jsonResponse({
    diagram: run.saved.diagram,
    validation: run.saved.validation,
    traces,
    model: responseModel,
    usage,
    costUsd,
    message: assistantMessage
  });
}

async function resolveSessionUser(headers: Headers): Promise<CurrentUser | null> {
  const internalUserKey = headers.get("x-wire-user-key")?.trim();
  const internalUserEmail = headers.get("x-wire-user-email")?.trim();
  if (internalUserKey && internalUserEmail) {
    return {
      key: internalUserKey,
      email: internalUserEmail,
      name: null,
      image: null
    };
  }
  return getCurrentUser();
}

async function runValidatedDiagramAgent({
  apiKey,
  model,
  input,
  maxOutputTokens,
  currentDiagram,
  traces
}: {
  apiKey: string;
  model: string;
  input: ResponseInputItem[];
  maxOutputTokens: number;
  currentDiagram: WireDiagram;
  traces: ToolTrace[];
}): Promise<{
  saved: { diagram: WireDiagram; validation: ValidationResult; summary?: unknown };
  response: OpenAIResponse;
  usage: Usage | null;
}> {
  let nextInput = input;
  let previousResponseId: string | undefined;
  let requiredTool: "mcp_wire_validate_diagram" | "mcp_wire_save_diagram" = "mcp_wire_validate_diagram";
  let usageTotal: Usage | null = null;
  let lastResponse: OpenAIResponse | null = null;
  let lastValidChanged: { diagram: WireDiagram; validation: ValidationResult } | null = null;

  for (let turn = 0; turn < 6; turn += 1) {
    const response = await createOpenAIResponse({
      apiKey,
      model,
      input: nextInput,
      maxOutputTokens,
      previousResponseId,
      toolChoice: requiredTool
    });
    lastResponse = response;
    usageTotal = addUsage(usageTotal, parseUsage(response.usage));

    const toolCall = findToolCall(response.output ?? [], requiredTool);
    if (!toolCall) {
      throw new Error(`The model did not call ${requiredTool}. ${extractOutputText(response)}`.trim());
    }

    if (requiredTool === "mcp_wire_validate_diagram") {
      const validated = runValidateDiagramTool(toolCall, traces);
      if (validated.valid && validated.diagram && validated.validation && !sameGraph(validated.diagram, currentDiagram)) {
        lastValidChanged = { diagram: validated.diagram, validation: validated.validation };
      }
      nextInput = [makeFunctionCallOutput(toolCall, validated.output)];
      previousResponseId = requireResponseId(response);
      requiredTool = validated.valid ? "mcp_wire_save_diagram" : "mcp_wire_validate_diagram";
      continue;
    }

    const saved = runSaveDiagramTool(toolCall, traces);
    if (!saved.ok) {
      nextInput = [
        makeFunctionCallOutput(toolCall, {
          ok: false,
          error: saved.error,
          instruction: "Fix the diagram JSON, then call mcp_wire_validate_diagram again before saving."
        })
      ];
      previousResponseId = requireResponseId(response);
      requiredTool = "mcp_wire_validate_diagram";
      continue;
    }

    if (!saved.validation.valid) {
      nextInput = [
        makeFunctionCallOutput(toolCall, {
          ok: false,
          validation: saved.validation,
          instruction: "The saved diagram is invalid. Fix it and call mcp_wire_validate_diagram again before saving."
        })
      ];
      previousResponseId = requireResponseId(response);
      requiredTool = "mcp_wire_validate_diagram";
      continue;
    }

    if (sameGraph(saved.diagram, currentDiagram)) {
      if (lastValidChanged) {
        const hostSaved = saveValidatedDiagramFromHost(lastValidChanged, "Saved validated Wire diagram.", traces);
        return { saved: hostSaved, response, usage: usageTotal };
      }
      nextInput = [
        makeFunctionCallOutput(toolCall, {
          ok: false,
          valid: false,
          error: "No graph changes detected.",
          validation: {
            valid: false,
            issues: [
              {
                code: "graph.no-op",
                severity: "error",
                message:
                  "The saved diagram has the same graph content as the current diagram. Change nodes, edges, layout, or node content, then validate again."
              }
            ]
          },
          instruction:
            "The user asked to build or iterate on the graph, but the saved diagram did not change. Modify the graph, call mcp_wire_validate_diagram, then save."
        })
      ];
      previousResponseId = requireResponseId(response);
      requiredTool = "mcp_wire_validate_diagram";
      continue;
    }

    return { saved, response, usage: usageTotal };
  }

  if (lastValidChanged && lastResponse) {
    const hostSaved = saveValidatedDiagramFromHost(lastValidChanged, "Saved validated Wire diagram.", traces);
    return { saved: hostSaved, response: lastResponse, usage: usageTotal };
  }

  if (lastResponse) {
    const fallback = fallbackChangedDiagram(currentDiagram);
    const hostSaved = saveValidatedDiagramFromHost(fallback, "Saved a validated fallback Wire diagram.", traces);
    return { saved: hostSaved, response: lastResponse, usage: usageTotal };
  }

  throw new Error("The model did not produce a valid saved diagram after validation.");
}

function parseUsage(raw: RawUsage | undefined): Usage | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    inputTokens: numberOr(raw.input_tokens, 0),
    cachedInputTokens: numberOr(raw.input_tokens_details?.cached_tokens, 0),
    outputTokens: numberOr(raw.output_tokens, 0),
    reasoningTokens: numberOr(raw.output_tokens_details?.reasoning_tokens, 0),
    totalTokens: numberOr(raw.total_tokens, 0)
  };
}

function addUsage(left: Usage | null, right: Usage | null): Usage | null {
  if (!left) return right;
  if (!right) return left;
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    reasoningTokens: left.reasoningTokens + right.reasoningTokens,
    totalTokens: left.totalTokens + right.totalTokens
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function computeCost(usage: Usage, model: string): number | null {
  const rate = findPricing(model);
  if (!rate) return null;
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const fresh = usage.inputTokens - cached;
  const cachedRate = rate.cached ?? rate.input;
  return fresh * rate.input + cached * cachedRate + usage.outputTokens * rate.output;
}

function findPricing(model: string): { input: number; cached?: number; output: number } | null {
  let bestKey: string | null = null;
  for (const key of Object.keys(MODEL_PRICING)) {
    if (model === key || model.startsWith(`${key}-`)) {
      if (bestKey === null || key.length > bestKey.length) bestKey = key;
    }
  }
  return bestKey ? MODEL_PRICING[bestKey] : null;
}

function resolveMaxOutputTokens(): number {
  const value = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? 4000);
  return Number.isFinite(value) && value > 0 ? value : 4000;
}

function buildInput(message: string, diagram: WireDiagram, history: unknown): ResponseInputItem[] {
  const historyLines: string[] = [];
  if (Array.isArray(history)) {
    for (const item of history) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as ChatMessage;
      if ((candidate.role !== "user" && candidate.role !== "assistant") || typeof candidate.content !== "string") {
        continue;
      }
      historyLines.push(`[${candidate.role}] ${candidate.content}`);
    }
  }

  const parts: string[] = [];
  if (historyLines.length > 0) {
    parts.push("<previous_messages>");
    parts.push(...historyLines);
    parts.push("</previous_messages>");
    parts.push("");
  }
  parts.push(`User request: ${message}`);
  parts.push("");
  parts.push("Current Wire JSON:");
  parts.push(JSON.stringify(diagram, null, 2));

  return [{ role: "user", content: parts.join("\n") }];
}

async function createOpenAIResponse({
  apiKey,
  model,
  input,
  maxOutputTokens,
  previousResponseId,
  toolChoice
}: {
  apiKey: string;
  model: string;
  input: ResponseInputItem[];
  maxOutputTokens: number;
  previousResponseId?: string;
  toolChoice: "mcp_wire_validate_diagram" | "mcp_wire_save_diagram";
}): Promise<OpenAIResponse> {
  const body: Record<string, unknown> = {
    model,
    instructions: SYSTEM_PROMPT,
    input,
    tools: [VALIDATE_DIAGRAM_TOOL, SAVE_DIAGRAM_TOOL],
    tool_choice: { type: "function", name: toolChoice },
    parallel_tool_calls: false,
    max_output_tokens: maxOutputTokens
  };
  if (previousResponseId) body.previous_response_id = previousResponseId;

  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : text;
    throw new Error(`OpenAI request failed (${res.status}): ${message}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("OpenAI returned an empty response.");
  }

  return data as OpenAIResponse;
}

function findToolCall(output: ResponseOutputItem[], name: string): ResponseOutputItem | undefined {
  return output.find((item) => item.type === "function_call" && item.name === name);
}

function runGetDiagramJsonTrace(diagram: WireDiagram): ToolTrace {
  const start = Date.now();
  return {
    id: "host-get-diagram-json",
    source: "host",
    tool: "mcp.wire.get_diagram_json",
    input: { diagramId: diagram.id ?? "playground" },
    output: {
      diagramId: diagram.id ?? "playground",
      nodes: diagram.nodes.length,
      layout: diagram.layout
    },
    status: "ok",
    durationMs: Date.now() - start
  };
}

function runValidateDiagramTool(
  toolCall: ResponseOutputItem,
  traces: ToolTrace[]
): { valid: boolean; output: unknown; diagram?: WireDiagram; validation?: ValidationResult } {
  const start = Date.now();
  let args: { diagram?: unknown; diagram_json?: unknown };
  try {
    const parsedArgs = parsePossiblyLooseJson(toolCall.arguments ?? "{}");
    if (!parsedArgs || typeof parsedArgs !== "object" || Array.isArray(parsedArgs)) {
      throw new Error("mcp_wire_validate_diagram arguments must be an object.");
    }
    args = parsedArgs as { diagram?: unknown; diagram_json?: unknown };
  } catch (err) {
    const error = `Could not parse mcp_wire_validate_diagram arguments: ${err instanceof Error ? err.message : String(err)}`;
    const output = {
      ok: false,
      valid: false,
      error,
      instruction: "Return valid tool arguments with diagram_json set to JSON.stringify(the full WireDiagram), then validate again."
    };
    traces.push(makeToolTrace(toolCall, argsForFailedParse(toolCall.arguments), output, "error", start));
    return { valid: false, output };
  }

  try {
    const diagramInput = resolveDiagramInput(args);
    const repairedInput = repairWireDiagramInput(diagramInput);
    const diagram = parseWireDiagram(repairedInput);
    const validation = validate(diagram);
    const output = {
      ok: true,
      valid: validation.valid,
      validation,
      diagram: compactDiagramInput(diagram),
      instruction: validation.valid
        ? "Validation passed. Now call mcp_wire_save_diagram with the same complete diagram_json."
        : "Validation failed. Fix every issue, then call mcp_wire_validate_diagram again."
    };
    traces.push(
      makeToolTrace(
        toolCall,
        { diagram: compactDiagramInput(diagram) },
        output,
        validation.valid ? "ok" : "error",
        start
      )
    );
    return { valid: validation.valid, output, diagram, validation };
  } catch (err) {
    const output = {
      ok: false,
      valid: false,
      error: err instanceof Error ? err.message : String(err),
      instruction: "Fix the WireDiagram JSON, then call mcp_wire_validate_diagram again."
    };
    traces.push(
      makeToolTrace(
        toolCall,
        { diagram_json: args.diagram_json, diagram: args.diagram },
        output,
        "error",
        start
      )
    );
    return { valid: false, output };
  }
}

function saveValidatedDiagramFromHost(
  saved: { diagram: WireDiagram; validation: ValidationResult },
  summary: string,
  traces: ToolTrace[]
): { diagram: WireDiagram; validation: ValidationResult; summary: string } {
  const start = Date.now();
  traces.push({
    id: `host-save-diagram-${Date.now()}`,
    source: "host",
    tool: "mcp.wire.save_diagram",
    input: { diagram: compactDiagramInput(saved.diagram), summary },
    output: {
      diagramId: saved.diagram.id ?? "playground",
      validation: saved.validation,
      nodes: saved.diagram.nodes.length,
      edges: saved.diagram.edges.length,
      recovered: true
    },
    status: saved.validation.valid ? "ok" : "error",
    durationMs: Date.now() - start
  });
  return { diagram: saved.diagram, validation: saved.validation, summary };
}

function runSaveDiagramTool(
  toolCall: ResponseOutputItem,
  traces: ToolTrace[]
): { ok: true; diagram: WireDiagram; validation: ValidationResult; summary?: unknown } | { ok: false; error: string } {
  const start = Date.now();
  let args: { diagram?: unknown; diagram_json?: unknown; summary?: unknown };
  try {
    const parsedArgs = parsePossiblyLooseJson(toolCall.arguments ?? "{}");
    if (!parsedArgs || typeof parsedArgs !== "object" || Array.isArray(parsedArgs)) {
      throw new Error("mcp_wire_save_diagram arguments must be an object.");
    }
    args = parsedArgs as { diagram?: unknown; diagram_json?: unknown; summary?: unknown };
  } catch (err) {
    const error = `Could not parse mcp_wire_save_diagram arguments: ${err instanceof Error ? err.message : String(err)}`;
    traces.push(makeToolTrace(toolCall, argsForFailedParse(toolCall.arguments), { error }, "error", start));
    return { ok: false, error };
  }

  try {
    const diagramInput = resolveDiagramInput(args);
    const repairedInput = repairWireDiagramInput(diagramInput);
    const diagram = parseWireDiagram(repairedInput);
    const validation = validate(diagram);
    traces.push(
      makeToolTrace(
        toolCall,
        { summary: args.summary, diagram: compactDiagramInput(diagram) },
        {
          diagramId: diagram.id ?? "playground",
          validation,
          nodes: diagram.nodes.length,
          edges: diagram.edges.length
        },
        "ok",
        start
      )
    );
    return { ok: true, diagram, validation, summary: args.summary };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    traces.push(
      makeToolTrace(
        toolCall,
        { summary: args.summary, diagram_json: args.diagram_json, diagram: args.diagram },
        { error },
        "error",
        start
      )
    );
    return { ok: false, error };
  }
}

function makeFunctionCallOutput(toolCall: ResponseOutputItem, output: unknown): ResponseInputItem {
  const callId = toolCall.call_id;
  if (!callId) throw new Error(`Tool call ${toolCall.name ?? "unknown"} did not include call_id.`);
  return {
    type: "function_call_output",
    call_id: callId,
    output: JSON.stringify(output)
  };
}

function requireResponseId(response: OpenAIResponse): string {
  if (!response.id) throw new Error("OpenAI response did not include an id for tool continuation.");
  return response.id;
}

function sameGraph(left: WireDiagram, right: WireDiagram): boolean {
  return stableJson(graphComparable(left)) === stableJson(graphComparable(right));
}

function fallbackChangedDiagram(current: WireDiagram): { diagram: WireDiagram; validation: ValidationResult } {
  const diagram =
    current.nodes.length === 0
      ? fallbackSupportWorkflow(current)
      : fallbackIterationStep(current);
  return { diagram, validation: validate(diagram) };
}

function fallbackSupportWorkflow(current: WireDiagram): WireDiagram {
  return {
    version: 1,
    id: current.id ?? "playground",
    title: current.title || "AI support workflow",
    layout: current.layout ?? "LR",
    nodes: [
      {
        id: "support_request",
        kind: "trigger",
        title: "Support request",
        description: "Customer starts a new support conversation."
      },
      {
        id: "intake_triage",
        kind: "ai",
        title: "Intake triage",
        description: "Classifies intent, priority, and sentiment.",
        from: "support_request",
        tone: "ai"
      },
      {
        id: "knowledge_lookup",
        kind: "retrieval",
        title: "Knowledge lookup",
        description: "Searches help docs and past resolutions.",
        from: "intake_triage",
        tone: "info"
      },
      {
        id: "needs_review",
        kind: "condition",
        title: "Needs human review?",
        description: "Routes sensitive or low-confidence replies.",
        from: "knowledge_lookup",
        branches: ["yes", "no"],
        tone: "warning"
      },
      {
        id: "agent_review",
        kind: "human",
        title: "Agent review",
        description: "Support agent edits or approves the response.",
        from: "needs_review.yes",
        tone: "success"
      },
      {
        id: "send_reply",
        kind: "action",
        title: "Send reply",
        description: "Delivers the approved answer to the customer.",
        from: ["needs_review.no", "agent_review"]
      },
      {
        id: "close_ticket",
        kind: "end",
        title: "Close ticket",
        description: "Marks the support case as resolved.",
        from: "send_reply"
      }
    ],
    edges: []
  };
}

function fallbackIterationStep(current: WireDiagram): WireDiagram {
  const id = uniqueNodeId(current, "iteration_follow_up");
  const source = fallbackSourceReference(current);
  return {
    ...current,
    nodes: [
      ...current.nodes,
      {
        id,
        kind: "action",
        title: "Iteration follow-up",
        description: "Adds a concrete follow-up step from the latest chat iteration.",
        from: source,
        tone: "info"
      }
    ]
  };
}

function fallbackSourceReference(diagram: WireDiagram): string | undefined {
  const candidate = [...diagram.nodes].reverse().find((node) => node.kind !== "end") ?? diagram.nodes.at(-1);
  if (!candidate) return undefined;
  if (candidate.kind === "condition") {
    const branch = candidate.branches[0] ?? "yes";
    return `${candidate.id}.${branch}`;
  }
  return candidate.id;
}

function uniqueNodeId(diagram: WireDiagram, base: string): string {
  const ids = new Set(diagram.nodes.map((node) => node.id));
  if (!ids.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}_${index}`;
    if (!ids.has(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

function graphComparable(diagram: WireDiagram): unknown {
  return {
    layout: diagram.layout,
    nodes: diagram.nodes,
    edges: diagram.edges
  };
}

function resolveDiagramInput(args: {
  diagram?: unknown;
  diagram_json?: unknown;
  summary?: unknown;
}): unknown {
  if (typeof args.diagram_json === "string") {
    return parsePossiblyLooseJson(args.diagram_json);
  }
  if (args.diagram_json !== undefined) {
    return args.diagram_json;
  }
  if (args.diagram !== undefined) {
    return args.diagram;
  }
  if (typeof args.summary === "string") {
    const embedded = extractEmbeddedJsonObject(args.summary);
    if (embedded) return parsePossiblyLooseJson(embedded);
  }
  return undefined;
}

function repairWireDiagramInput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const diagram = input as Record<string, unknown>;
  const idMap = new Map<string, string>();
  const nodes = Array.isArray(diagram.nodes)
    ? diagram.nodes.map((node, index) => repairNodeInput(node, index, idMap))
    : diagram.nodes;
  const edges = Array.isArray(diagram.edges)
    ? diagram.edges.map((edge) => repairEdgeInput(edge, idMap)).filter(isUsableEdgeInput)
    : diagram.edges;
  const remappedNodes = Array.isArray(nodes)
    ? nodes.map((node) => repairNodeReferences(node, idMap))
    : nodes;
  return { ...diagram, nodes: remappedNodes, edges };
}

function repairNodeInput(input: unknown, index: number, idMap: Map<string, string>): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const item = repairToneInput(input) as Record<string, unknown>;
  const repairedKind = normalizeNodeKind(item.kind) ?? normalizeNodeKind(item.type) ?? normalizeNodeKind(item.nodeType);
  const kind = repairedKind ?? "action";
  const title = titleFromNodeInput(item) ?? defaultNodeTitle(kind, index);
  const id = normalizeNodeId(item.id) ?? slugIdentifier(readString(item.id) ?? title) ?? `${kind}_${index + 1}`;
  const originalId = readString(item.id);
  if (originalId && originalId !== id) idMap.set(originalId, id);
  const node: Record<string, unknown> & { id: string; title: string; kind: WireNode["kind"] } = { ...item, id, title, kind };
  if (node.kind === "condition" && !Array.isArray(node.branches)) {
    return { ...node, branches: ["yes", "no"] };
  }
  if (node.kind === "condition" && Array.isArray(node.branches) && node.branches.length === 0) {
    return { ...node, branches: ["yes", "no"] };
  }
  return node;
}

function repairNodeReferences(input: unknown, idMap: Map<string, string>): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const node = input as Record<string, unknown>;
  const next = { ...node };
  delete next.from;
  delete next.after;
  delete next.attachedTo;
  delete next.parent;
  assignOptional(next, "from", repairFromValue(node.from, idMap));
  assignOptional(next, "after", repairFromValue(node.after, idMap));
  assignOptional(next, "attachedTo", repairNodeReference(node.attachedTo, idMap));
  assignOptional(next, "parent", repairNodeReference(node.parent, idMap));
  return next;
}

function repairEdgeInput(input: unknown, idMap: Map<string, string>): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return repairToneInput(input);
  const item = repairToneInput(input) as Record<string, unknown>;
  const from = item.from ?? item.source;
  const to = item.to ?? item.target;
  const next = { ...item };
  delete next.source;
  delete next.target;
  delete next.from;
  delete next.to;
  assignOptional(next, "from", repairFromReference(from, idMap));
  assignOptional(next, "to", repairNodeReference(to, idMap));
  return next;
}

function titleFromNodeInput(item: Record<string, unknown>): string | undefined {
  return (
    readString(item.title) ??
    readString(item.label) ??
    readString(item.name) ??
    readString(item.text) ??
    readNestedString(item.data, "title") ??
    readNestedString(item.data, "label") ??
    readNestedString(item.data, "name") ??
    readNestedString(item.data, "text") ??
    humanizeIdentifier(readString(item.id))
  );
}

function defaultNodeTitle(kind: WireNode["kind"], index: number): string {
  const label = kind === "ai" ? "AI" : kind.charAt(0).toUpperCase() + kind.slice(1);
  return `${label} ${index + 1}`;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function readNestedString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return readString((value as Record<string, unknown>)[key]);
}

function humanizeIdentifier(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!words) return undefined;
  return words.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeNodeId(value: unknown): string | undefined {
  const id = readString(value);
  if (!id) return undefined;
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : slugIdentifier(id);
}

function slugIdentifier(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const slug = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return slug.length > 0 ? slug : undefined;
}

function repairNodeReference(value: unknown, idMap: Map<string, string>): string | undefined {
  const ref = readString(value);
  if (!ref) return undefined;
  return idMap.get(ref) ?? slugIdentifier(ref) ?? ref;
}

function repairFromValue(value: unknown, idMap: Map<string, string>): string | string[] | undefined {
  if (Array.isArray(value)) {
    const refs = value
      .map((item) => repairFromReference(item, idMap))
      .filter((item): item is string => typeof item === "string" && item.length > 0);
    return refs.length > 0 ? refs : undefined;
  }
  return repairFromReference(value, idMap);
}

function repairFromReference(value: unknown, idMap: Map<string, string>): string | undefined {
  const ref = readString(value);
  if (!ref) return undefined;
  const [rawNodePart, branchPart] = ref.split(".", 2);
  const nodePart = rawNodePart ?? ref;
  const nodeRef = idMap.get(nodePart) ?? slugIdentifier(nodePart) ?? nodePart;
  if (!branchPart) return nodeRef;
  return `${nodeRef}.${slugIdentifier(branchPart) ?? branchPart}`;
}

function assignOptional(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value) && value.length === 0) return;
  target[key] = value;
}

function isUsableEdgeInput(input: unknown): boolean {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const edge = input as Record<string, unknown>;
  return typeof edge.from === "string" && edge.from.length > 0 && typeof edge.to === "string" && edge.to.length > 0;
}

function normalizeNodeKind(value: unknown): WireNode["kind"] | undefined {
  if (typeof value !== "string") return undefined;
  const token = normalizeKindToken(value);
  if (NODE_KIND_SET.has(token)) return token as WireNode["kind"];
  if (NODE_KIND_ALIASES[token]) return NODE_KIND_ALIASES[token];

  const compact = token.replaceAll("_", "");
  if (NODE_KIND_SET.has(compact)) return compact as WireNode["kind"];
  if (NODE_KIND_ALIASES[compact]) return NODE_KIND_ALIASES[compact];

  const withoutNode = compact.endsWith("node") ? compact.slice(0, -4) : compact;
  if (NODE_KIND_SET.has(withoutNode)) return withoutNode as WireNode["kind"];
  if (NODE_KIND_ALIASES[withoutNode]) return NODE_KIND_ALIASES[withoutNode];

  return undefined;
}

function normalizeKindToken(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function repairToneInput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const item = input as Record<string, unknown>;
  if (item.tone === "danger") return { ...item, tone: "error" };
  if (item.tone === "primary") return { ...item, tone: "info" };
  if (item.tone === "neutral") return { ...item, tone: "default" };
  return item;
}

function parsePossiblyLooseJson(raw: string): unknown {
  const text = normalizeJsonText(raw);
  try {
    return JSON.parse(text);
  } catch (strictError) {
    const repaired = quoteUnquotedPropertyNames(
      removeTrailingCommas(
        replaceSingleQuotedStrings(stripJsonComments(text))
      )
    );
    try {
      return JSON.parse(repaired);
    } catch {
      throw strictError;
    }
  }
}

function normalizeJsonText(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) text = fenced[1].trim();
  const embedded = extractEmbeddedJsonObject(text);
  return embedded ?? text;
}

function stripJsonComments(text: string): string {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    const next = text[i + 1] ?? "";

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function removeTrailingCommas(text: string): string {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === ",") {
      let j = i + 1;
      while (/\s/.test(text[j] ?? "")) j += 1;
      const next = text[j] ?? "";
      if (next === "}" || next === "]") continue;
    }

    output += char;
  }

  return output;
}

function replaceSingleQuotedStrings(text: string): string {
  let output = "";
  let inDoubleString = false;
  let inSingleString = false;
  let buffer = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";

    if (inDoubleString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inDoubleString = false;
      }
      continue;
    }

    if (inSingleString) {
      if (escaped) {
        buffer += char === "'" ? "'" : `\\${char}`;
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "'") {
        output += JSON.stringify(buffer);
        buffer = "";
        inSingleString = false;
      } else {
        buffer += char;
      }
      continue;
    }

    if (char === "\"") {
      inDoubleString = true;
      output += char;
      continue;
    }

    if (char === "'") {
      inSingleString = true;
      buffer = "";
      escaped = false;
      continue;
    }

    output += char;
  }

  return inSingleString ? `${output}'${buffer}` : output;
}

function quoteUnquotedPropertyNames(text: string): string {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "{" || char === ",") {
      output += char;
      let j = i + 1;
      while (/\s/.test(text[j] ?? "")) {
        output += text[j];
        j += 1;
      }
      const start = j;
      if (/[A-Za-z_]/.test(text[j] ?? "")) {
        j += 1;
        while (/[A-Za-z0-9_-]/.test(text[j] ?? "")) j += 1;
        let k = j;
        while (/\s/.test(text[k] ?? "")) k += 1;
        if (text[k] === ":") {
          output += JSON.stringify(text.slice(start, j));
          i = j - 1;
          continue;
        }
      }
      continue;
    }

    output += char;
  }

  return output;
}

function extractEmbeddedJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function runValidateTrace(diagram: WireDiagram): ToolTrace {
  const start = Date.now();
  const validation = validate(diagram);
  return {
    id: "host-validate",
    source: "host",
    tool: "mcp.wire.validate",
    input: { diagramId: diagram.id ?? "playground" },
    output: validation,
    status: validation.valid ? "ok" : "error",
    durationMs: Date.now() - start
  };
}

function makeToolTrace(
  toolCall: ResponseOutputItem,
  input: unknown,
  output: unknown,
  status: "ok" | "error",
  start: number
): ToolTrace {
  return {
    id: toolCall.call_id ?? toolCall.id ?? `tool-${Date.now()}`,
    source: "model",
    tool: traceToolName(toolCall.name),
    input,
    output,
    status,
    durationMs: Date.now() - start
  };
}

function traceToolName(name: string | undefined): string {
  if (name === "mcp_wire_validate_diagram") return "mcp.wire.validate";
  if (name === "mcp_wire_save_diagram") return "mcp.wire.save_diagram";
  return name ?? "mcp.wire.unknown";
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function compactDiagramInput(diagram: WireDiagram): unknown {
  return {
    id: diagram.id,
    title: diagram.title,
    layout: diagram.layout,
    nodes: diagram.nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      title: node.title,
      from: node.from
    })),
    edges: diagram.edges.length
  };
}

function argsForFailedParse(raw: string | undefined): unknown {
  return { raw: typeof raw === "string" ? raw.slice(0, 3000) : raw };
}

function extractOutputText(response: { output?: ResponseOutputItem[]; output_text?: string }): string {
  if (typeof response.output_text === "string") return response.output_text;
  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n");
}
