import {
  parseWireDiagram,
  validate,
  type ValidationResult,
  type WireDiagram
} from "@aigentive/wire-core";
import { WIRE_AGENT_GUIDE } from "@aigentive/wire-mcp/dist/agent-guide.js";
import type { NextRequest } from "next/server";

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
- Use MCP tool mcp_wire_save_diagram exactly once with diagram_json set to JSON.stringify(the full updated diagram).
- Keep summary short. Do not put the diagram JSON in summary.
- The final visible chat answer should be short and confirm success.

WIRING RULES (validation will reject anything that breaks these):
- Node ids and branch names must match the slug pattern /^[A-Za-z0-9_-]+$/.
  Letters, digits, hyphen, underscore only. No spaces, dots, colons, slashes, emoji, or accented characters.
  Valid examples: "trigger", "classify_intent", "route", "notify-sales", "step1".
  Invalid examples: "user input", "Customer Support", "trigger:hook", "team.sales", "router/branch", "🚀launch".
- Connect nodes by setting the target node's "from" field. Prefer this over the top-level "edges" array.
    - Single source: "from": "classify"
    - Fan-in (multiple sources): "from": ["validate", "review"]
    - From a condition branch: "from": "route.sales" (one dot only — pattern is <nodeId>.<branch>, both slug-safe)
- Use the "edges" array only when you need a label, branch, fromHandle/toHandle, tone, or routing.
  Each edge: { "from": "<nodeId>" or "<nodeId>.<branch>", "to": "<nodeId>" } — both must be slug-safe.
- Every "from" reference must point to a node id that actually exists in this diagram.
- Every condition node must declare "branches" (e.g. ["yes", "no"]).
  When you reference a branch via "<nodeId>.<branch>", the branch name must appear in that condition node's "branches".
- Do not leave orphan nodes: every non-trigger node should be reachable from a trigger via a chain of "from" references.
- Keep ids short and descriptive (snake_case or kebab-case). Do not reuse the same id for two nodes.`;

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: "OPENAI_API_KEY is not set on the playground server." },
      503
    );
  }

  const traces: ToolTrace[] = [];
  traces.push(runGetDiagramJsonTrace(currentDiagram));

  const requestedModel = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
  let response: { output?: ResponseOutputItem[]; output_text?: string; usage?: RawUsage; model?: string };
  try {
    response = await createOpenAIResponse({
      apiKey,
      model: requestedModel,
      input: buildInput(payload.message, currentDiagram, payload.history),
      maxOutputTokens: resolveMaxOutputTokens()
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err), traces },
      502
    );
  }

  const responseModel = typeof response.model === "string" ? response.model : requestedModel;
  const usage = parseUsage(response.usage);
  const costUsd = usage ? computeCost(usage, responseModel) : null;

  const toolCall = findSaveDiagramCall(response.output ?? []);
  if (!toolCall) {
    return jsonResponse(
      {
        error: "The model did not call mcp_wire_save_diagram.",
        assistantText: extractOutputText(response),
        traces,
        model: responseModel,
        usage,
        costUsd
      },
      502
    );
  }

  const saved = runSaveDiagramTool(toolCall, traces);
  if (!saved.ok) {
    return jsonResponse({ error: saved.error, traces, model: responseModel, usage, costUsd }, 422);
  }

  const validationTrace = runValidateTrace(saved.diagram);
  traces.push(validationTrace);

  return jsonResponse({
    diagram: saved.diagram,
    validation: saved.validation,
    traces,
    model: responseModel,
    usage,
    costUsd,
    message:
      typeof saved.summary === "string" && saved.summary.trim().length > 0
        ? saved.summary.trim()
        : "Wire diagram updated."
  });
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

function buildInput(message: string, diagram: WireDiagram, history: unknown): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-8)) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as ChatMessage;
      if ((candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string") {
        messages.push({ role: candidate.role, content: candidate.content.slice(0, 1200) });
      }
    }
  }
  messages.push({
    role: "user",
    content: [
      `User request: ${message}`,
      "",
      "Current Wire JSON:",
      JSON.stringify(diagram, null, 2)
    ].join("\n")
  });
  return messages;
}

async function createOpenAIResponse({
  apiKey,
  model,
  input,
  maxOutputTokens
}: {
  apiKey: string;
  model: string;
  input: Array<{ role: string; content: string }>;
  maxOutputTokens: number;
}): Promise<{ output?: ResponseOutputItem[]; output_text?: string }> {
  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: SYSTEM_PROMPT,
      input,
      tools: [SAVE_DIAGRAM_TOOL],
      tool_choice: { type: "function", name: "mcp_wire_save_diagram" },
      parallel_tool_calls: false,
      max_output_tokens: maxOutputTokens
    })
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

  return data as { output?: ResponseOutputItem[]; output_text?: string };
}

function findSaveDiagramCall(output: ResponseOutputItem[]): ResponseOutputItem | undefined {
  return output.find((item) => item.type === "function_call" && item.name === "mcp_wire_save_diagram");
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

function runSaveDiagramTool(
  toolCall: ResponseOutputItem,
  traces: ToolTrace[]
): { ok: true; diagram: WireDiagram; validation: ValidationResult; summary?: unknown } | { ok: false; error: string } {
  const start = Date.now();
  let args: { diagram?: unknown; diagram_json?: unknown; summary?: unknown };
  try {
    args = JSON.parse(toolCall.arguments ?? "{}") as { diagram?: unknown; diagram_json?: unknown; summary?: unknown };
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

function resolveDiagramInput(args: {
  diagram?: unknown;
  diagram_json?: unknown;
  summary?: unknown;
}): unknown {
  if (typeof args.diagram_json === "string") {
    return JSON.parse(args.diagram_json);
  }
  if (args.diagram !== undefined) {
    return args.diagram;
  }
  if (typeof args.summary === "string") {
    const embedded = extractEmbeddedJsonObject(args.summary);
    if (embedded) return JSON.parse(embedded);
  }
  return undefined;
}

function repairWireDiagramInput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const diagram = input as Record<string, unknown>;
  const nodes = Array.isArray(diagram.nodes)
    ? diagram.nodes.map((node) => repairNodeInput(node))
    : diagram.nodes;
  const edges = Array.isArray(diagram.edges)
    ? diagram.edges.map((edge) => repairToneInput(edge))
    : diagram.edges;
  return { ...diagram, nodes, edges };
}

function repairNodeInput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const node = repairToneInput(input) as Record<string, unknown>;
  if (node.kind === "condition" && !Array.isArray(node.branches)) {
    return { ...node, branches: ["yes", "no"] };
  }
  if (node.kind === "condition" && Array.isArray(node.branches) && node.branches.length === 0) {
    return { ...node, branches: ["yes", "no"] };
  }
  return node;
}

function repairToneInput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const item = input as Record<string, unknown>;
  if (item.tone === "danger") return { ...item, tone: "error" };
  if (item.tone === "primary") return { ...item, tone: "info" };
  if (item.tone === "neutral") return { ...item, tone: "default" };
  return item;
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
    tool: "mcp.wire.save_diagram",
    input,
    output,
    status,
    durationMs: Date.now() - start
  };
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
