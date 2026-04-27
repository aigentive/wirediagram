#!/usr/bin/env node
/**
 * @aigentive/wire-mcp — MCP server for Wire.
 *
 * Transports:
 *   default        : stdio (MCP standard)
 *   --http         : streamable HTTP on WIRE_HTTP_PORT (default 3860)
 *
 * Environment:
 *   WIRE_STORAGE_DIR     Directory for diagram .json files (default ~/.wire/diagrams)
 *   WIRE_HTTP_PORT       HTTP transport port (default 3860)
 *   WIRE_HTTP_HOST       HTTP transport host (default 127.0.0.1)
 *   WIRE_AUDIT_LOG       File path for JSONL audit log (default: stderr only)
 *   WIRE_DEFAULT_LAYOUT  LR | TB | RL | BT (default LR)
 *   WIRE_AGENT_ID        Audit actor id (default wire-mcp)
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  applyWireAction,
  applyWireActions,
  emptyDiagram,
  parseWireDiagram,
  toMermaid,
  validate as coreValidate,
  wireDiagramJsonSchema,
  WireDiagramSchema,
  type WireAction,
  type WireDiagram
} from "@aigentive/wire-core";

import { loadConfig, type WireMcpConfig } from "./config.js";
import { FileStorage, MemoryStorage, type StorageBackend, createDefaultDiagram } from "./storage.js";
import { AuditLogger } from "./audit.js";
import { renderSvg, renderPng, summarizeDiagram } from "./render.js";
import { getTemplate, listTemplates, TEMPLATES } from "./templates.js";
import { PROMPTS } from "./prompts.js";
import { WIRE_AGENT_GUIDE } from "./agent-guide.js";

// Re-exports for embedders (Next.js routes, custom servers)
export { FileStorage, MemoryStorage, createDefaultDiagram };
export type { StorageBackend, WireMcpConfig };
export { renderSvg, renderPng, summarizeDiagram };
export { TEMPLATES, getTemplate, listTemplates };
export { PROMPTS };
export { WIRE_AGENT_GUIDE };

type ToolResult = {
  content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }>;
  isError?: true;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

const ToneEnum = z.enum(["default", "success", "warning", "error", "info", "ai"]);
const KindEnum = z.enum([
  "trigger", "action", "ai", "tool", "condition", "human",
  "memory", "retrieval", "guardrail", "end", "note", "group"
]);
const LayoutEnum = z.enum(["LR", "TB", "RL", "BT"]);
const SideEnum = z.enum(["left", "right", "top", "bottom"]);
const EdgeMarkerEnum = z.enum(["arrow", "circle", "diamond", "none"]);
const EdgeRoutingEnum = z.enum(["bezier", "smoothstep", "step", "straight"]);

const FromRefShape = z.union([z.string(), z.array(z.string())]);
const PositionInput = z.object({ x: z.number(), y: z.number() });
const SizeInput = z.object({ width: z.number().positive(), height: z.number().positive() });
const NodeStyleInput = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  strokeDasharray: z.string().optional(),
  borderRadius: z.number().nonnegative().optional(),
  opacity: z.number().min(0).max(1).optional(),
  shadow: z.boolean().optional(),
  textColor: z.string().optional()
});
const NodeHandlesInput = z.object({
  source: z.array(SideEnum).min(1).optional(),
  target: z.array(SideEnum).min(1).optional()
});
const EdgeStyleInput = z.object({
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  strokeDasharray: z.string().optional(),
  markerEnd: EdgeMarkerEnum.optional(),
  markerStart: EdgeMarkerEnum.optional(),
  curvature: z.number().min(0).max(1).optional()
});
const EdgeLabelStyleInput = z.object({
  fill: z.string().optional(),
  background: z.string().optional(),
  border: z.string().optional(),
  fontSize: z.number().positive().optional()
});

// ── Tool input schemas ─────────────────────────────────────────────────

const CreateDiagramInput = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/, "id must match /^[A-Za-z0-9_-]+$/"),
  title: z.string().optional(),
  layout: LayoutEnum.optional(),
  fromTemplate: z.string().optional()
});

const DiagramIdInput = z.object({
  diagramId: z.string()
});

const SaveDiagramInput = z.object({
  diagramId: z.string(),
  diagram: z.unknown().describe("Full canonical Wire diagram JSON to overwrite the stored copy.")
});

const PatchDiagramInput = z.object({
  diagramId: z.string(),
  patch: z.record(z.string(), z.unknown()).describe("Partial diagram patch. Use null to clear a field.")
});

const AddNodeInput = z.object({
  diagramId: z.string(),
  kind: KindEnum,
  title: z.string(),
  id: z.string().optional(),
  description: z.string().optional(),
  from: FromRefShape.optional(),
  after: FromRefShape.optional(),
  branch: z.string().optional(),
  attachedTo: z.string().optional(),
  parent: z.string().optional(),
  tone: ToneEnum.optional(),
  position: PositionInput.optional(),
  size: SizeInput.optional(),
  style: NodeStyleInput.optional(),
  handles: NodeHandlesInput.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  branches: z.array(z.string()).optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  tools: z.array(z.string()).optional(),
  ref: z.string().optional(),
  body: z.string().optional()
});

const UpdateNodeInput = z.object({
  diagramId: z.string(),
  id: z.string(),
  patch: z.record(z.string(), z.unknown())
});

const RemoveNodeInput = z.object({
  diagramId: z.string(),
  id: z.string()
});

const MoveNodeInput = z.object({
  diagramId: z.string(),
  id: z.string(),
  position: PositionInput
});

const ResizeNodeInput = z.object({
  diagramId: z.string(),
  id: z.string(),
  size: SizeInput
});

const ConnectInput = z.object({
  diagramId: z.string(),
  id: z.string().optional(),
  from: z.string(),
  to: z.string(),
  branch: z.string().optional(),
  label: z.string().optional(),
  tone: ToneEnum.optional(),
  fromHandle: SideEnum.optional(),
  toHandle: SideEnum.optional(),
  style: EdgeStyleInput.optional(),
  labelStyle: EdgeLabelStyleInput.optional(),
  routing: EdgeRoutingEnum.optional(),
  data: z.record(z.string(), z.unknown()).optional()
});

const DisconnectInput = z.object({
  diagramId: z.string(),
  from: z.string(),
  to: z.string(),
  branch: z.string().optional()
});

const UpdateEdgeInput = z.object({
  diagramId: z.string(),
  id: z.string(),
  patch: z.record(z.string(), z.unknown()).describe("Partial edge patch. Use null to clear fields. Supports label, tone, fromHandle, toHandle, style, labelStyle, routing, and data.")
});

const RemoveEdgeInput = z.object({
  diagramId: z.string(),
  id: z.string()
});

const AddNoteInput = z.object({
  diagramId: z.string(),
  title: z.string(),
  body: z.string().optional(),
  attachedTo: z.string().optional(),
  id: z.string().optional(),
  tone: ToneEnum.optional()
});

const SetLayoutInput = z.object({
  diagramId: z.string(),
  direction: LayoutEnum,
  engine: z.enum(["dagre", "elk"]).optional()
});

const AddGroupInput = z.object({
  diagramId: z.string(),
  id: z.string().optional(),
  title: z.string(),
  children: z.array(z.string()).optional(),
  description: z.string().optional(),
  position: PositionInput.optional(),
  size: SizeInput.optional(),
  style: NodeStyleInput.optional(),
  data: z.record(z.string(), z.unknown()).optional()
});

const UngroupInput = z.object({
  diagramId: z.string(),
  id: z.string()
});

const PatchMetadataInput = z.object({
  diagramId: z.string(),
  patch: z.record(z.string(), z.unknown()).describe("Metadata patch. Use null to clear a key.")
});

const ValidateInput = z.object({
  diagramId: z.string()
});

const RenderInput = z.object({
  diagramId: z.string()
});

const ApplyActionsInput = z.object({
  diagramId: z.string(),
  actions: z.array(z.object({ type: z.string() }).passthrough()).min(1)
});

// ── Server bootstrap ────────────────────────────────────────────────────

export interface ServerHandle {
  server: McpServer;
  config: WireMcpConfig;
  storage: StorageBackend;
}

export interface ServerOptions {
  storage?: StorageBackend;
  config?: Partial<WireMcpConfig>;
}

export function createServer(opts: ServerOptions = {}): ServerHandle {
  const baseConfig = loadConfig();
  const config: WireMcpConfig = { ...baseConfig, ...(opts.config ?? {}) };
  const storage: StorageBackend =
    opts.storage ?? (config.storageDir ? new FileStorage(config.storageDir) : new MemoryStorage());
  const audit = new AuditLogger({ filePath: config.auditLog });

  const server = new McpServer({
    name: "@aigentive/wire-mcp",
    version: "1.0.0"
  });

  // ── helpers ────────────────────────────────────────────────────────────

  async function loadOrCreate(diagramId: string): Promise<WireDiagram> {
    if (await storage.exists(diagramId)) {
      return storage.load(diagramId);
    }
    return createDefaultDiagram({ id: diagramId, layout: config.defaultLayout });
  }

  async function withDiagram<T>(
    toolName: string,
    diagramId: string,
    params: unknown,
    op: (diagram: WireDiagram) => Promise<T> | T
  ): Promise<ToolResult> {
    const start = Date.now();
    try {
      const diagram = await storage.load(diagramId);
      const result = await op(diagram);
      await audit.log({
        tool: toolName,
        actor: config.agentId,
        status: "ok",
        durationMs: Date.now() - start,
        diagramId,
        params
      });
      return ok(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await audit.log({
        tool: toolName,
        actor: config.agentId,
        status: "error",
        durationMs: Date.now() - start,
        diagramId,
        errorType: err instanceof Error ? err.constructor.name : "Error",
        params
      });
      return fail(message);
    }
  }

  async function withMutate(
    toolName: string,
    diagramId: string,
    params: unknown,
    op: (diagram: WireDiagram) => Promise<WireDiagram> | WireDiagram
  ): Promise<ToolResult> {
    const start = Date.now();
    try {
      let validation: ReturnType<typeof coreValidate> | undefined;
      const saved = await storage.mutate(diagramId, async (diagram) => {
        const next = await op(diagram);
        validation = coreValidate(next);
        return next;
      });
      await audit.log({
        tool: toolName,
        actor: config.agentId,
        status: "ok",
        durationMs: Date.now() - start,
        diagramId,
        params
      });
      return ok({
        diagramId,
        diagram: saved,
        validation: validation ?? coreValidate(saved)
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await audit.log({
        tool: toolName,
        actor: config.agentId,
        status: "error",
        durationMs: Date.now() - start,
        diagramId,
        errorType: err instanceof Error ? err.constructor.name : "Error",
        params
      });
      return fail(message);
    }
  }

  function stripUndefined<T extends Record<string, unknown>>(input: T): T {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) out[key] = value;
    }
    return out as T;
  }

  // ── tools ──────────────────────────────────────────────────────────────

  server.registerTool(
    "v1_get_agent_guide",
    {
      title: "Get Wire agent guide",
      description: "Return the concise Wire operating guide for MCP agents. Hosts may inject this guide into an agent prompt when available.",
      inputSchema: {}
    },
    async () => ok(WIRE_AGENT_GUIDE)
  );

  server.registerTool(
    "create_diagram",
    {
      title: "Create diagram",
      description: "Create a new diagram, optionally seeded from a built-in template (e.g. 'agent-workflow', 'approval-flow', 'rag-pipeline').",
      inputSchema: CreateDiagramInput.shape
    },
    async (params) => {
      const start = Date.now();
      try {
        const args = CreateDiagramInput.parse(params);
        if (await storage.exists(args.id)) {
          throw new Error(`Diagram "${args.id}" already exists. Use load_diagram or pick a new id.`);
        }
        let diagram: WireDiagram;
        if (args.fromTemplate) {
          const tpl = getTemplate(args.fromTemplate);
          if (!tpl) {
            throw new Error(`Unknown template "${args.fromTemplate}". Known: ${listTemplates().map((t) => t.name).join(", ")}.`);
          }
          diagram = { ...tpl, id: args.id };
          if (args.title !== undefined) diagram.title = args.title;
          if (args.layout) diagram.layout = args.layout;
        } else {
          const init: { id: string; title?: string; layout?: WireDiagram["layout"] } = {
            id: args.id,
            layout: args.layout ?? config.defaultLayout
          };
          if (args.title !== undefined) init.title = args.title;
          diagram = emptyDiagram(init);
        }
        const saved = await storage.save(args.id, diagram);
        await audit.log({
          tool: "create_diagram", actor: config.agentId, status: "ok",
          durationMs: Date.now() - start, diagramId: args.id, params: args
        });
        return ok({ diagramId: args.id, diagram: saved });
      } catch (err) {
        await audit.log({
          tool: "create_diagram", actor: config.agentId, status: "error",
          durationMs: Date.now() - start, params,
          errorType: err instanceof Error ? err.constructor.name : "Error"
        });
        return fail(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "load_diagram",
    { title: "Load diagram", description: "Load a stored diagram by id.", inputSchema: DiagramIdInput.shape },
    async (params) => {
      const args = DiagramIdInput.parse(params);
      return withDiagram("load_diagram", args.diagramId, args, (d) => ({ diagramId: args.diagramId, diagram: d }));
    }
  );

  server.registerTool(
    "save_diagram",
    {
      title: "Save diagram",
      description: "Overwrite a stored diagram with the provided JSON. Validates schema before writing.",
      inputSchema: SaveDiagramInput.shape
    },
    async (params) => {
      const start = Date.now();
      try {
        const args = SaveDiagramInput.parse(params);
        const diagram = parseWireDiagram(args.diagram);
        const validation = coreValidate(diagram);
        const saved = await storage.save(args.diagramId, diagram);
        await audit.log({
          tool: "save_diagram", actor: config.agentId, status: "ok",
          durationMs: Date.now() - start, diagramId: args.diagramId, params: { diagramId: args.diagramId }
        });
        return ok({ diagramId: args.diagramId, diagram: saved, validation });
      } catch (err) {
        await audit.log({
          tool: "save_diagram", actor: config.agentId, status: "error",
          durationMs: Date.now() - start, params,
          errorType: err instanceof Error ? err.constructor.name : "Error"
        });
        return fail(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "patch_diagram",
    {
      title: "Patch diagram metadata",
      description: "Patch top-level diagram fields such as title, description, layout, layoutEngine, and metadata. Use null in patch to clear a field.",
      inputSchema: PatchDiagramInput.shape
    },
    async (params) => {
      const args = PatchDiagramInput.parse(params);
      return withMutate("patch_diagram", args.diagramId, args, (diagram) =>
        applyWireAction(diagram, { type: "diagram.patch", patch: args.patch }, { validate: false, inverse: false }).diagram
      );
    }
  );

  server.registerTool(
    "list_diagrams",
    {
      title: "List diagrams",
      description: "List all stored diagrams, sorted by recency.",
      inputSchema: {}
    },
    async () => {
      try {
        const list = await storage.list();
        return ok({ diagrams: list });
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "add_node",
    {
      title: "Add node",
      description: "Append a node to a diagram. Use 'kind' to pick the node type and 'from' to wire it to an existing source. Branched refs use 'from': '<id>.<branch>' or supply 'from' + 'branch'.",
      inputSchema: AddNodeInput.shape
    },
    async (params) => {
      const args = AddNodeInput.parse(params);
      return withMutate("add_node", args.diagramId, args, (diagram) => {
        const action: WireAction = {
          type: "node.add",
          node: stripUndefined({
            kind: args.kind,
            title: args.title,
            id: args.id,
            description: args.description,
            from: args.from,
            after: args.after,
            branch: args.branch,
            attachedTo: args.attachedTo,
            parent: args.parent,
            tone: args.tone,
            position: args.position,
            size: args.size,
            style: args.style,
            handles: args.handles,
            data: args.data,
            branches: args.branches,
            model: args.model,
            prompt: args.prompt,
            tools: args.tools,
            ref: args.ref,
            body: args.body
          })
        };
        return applyWireAction(diagram, action, { validate: false, inverse: false }).diagram;
      });
    }
  );

  server.registerTool(
    "update_node",
    {
      title: "Update node",
      description: "Patch fields on an existing node. Use null in patch to clear a field.",
      inputSchema: UpdateNodeInput.shape
    },
    async (params) => {
      const args = UpdateNodeInput.parse(params);
      return withMutate("update_node", args.diagramId, args, (diagram) =>
        applyWireAction(diagram, { type: "node.patch", id: args.id, patch: args.patch }, { validate: false, inverse: false }).diagram
      );
    }
  );

  server.registerTool(
    "remove_node",
    {
      title: "Remove node",
      description: "Remove a node and prune any references (from, parent, group.children).",
      inputSchema: RemoveNodeInput.shape
    },
    async (params) => {
      const args = RemoveNodeInput.parse(params);
      return withMutate("remove_node", args.diagramId, args, (diagram) =>
        applyWireAction(diagram, { type: "node.remove", id: args.id }, { validate: false, inverse: false }).diagram
      );
    }
  );

  server.registerTool(
    "move_node",
    {
      title: "Move node",
      description: "Set a node position while preserving all other fields. Use when a React/cloud drag or an agent layout correction should persist manual placement.",
      inputSchema: MoveNodeInput.shape
    },
    async (params) => {
      const args = MoveNodeInput.parse(params);
      return withMutate("move_node", args.diagramId, args, (diagram) =>
        applyWireAction(
          diagram,
          { type: "node.move", id: args.id, position: args.position },
          { validate: false, inverse: false }
        ).diagram
      );
    }
  );

  server.registerTool(
    "resize_node",
    {
      title: "Resize node",
      description: "Set a node size while preserving all other fields. Use for cloud/editor resize gestures or explicit visual layout fixes.",
      inputSchema: ResizeNodeInput.shape
    },
    async (params) => {
      const args = ResizeNodeInput.parse(params);
      return withMutate("resize_node", args.diagramId, args, (diagram) =>
        applyWireAction(
          diagram,
          { type: "node.resize", id: args.id, size: args.size },
          { validate: false, inverse: false }
        ).diagram
      );
    }
  );

  server.registerTool(
    "connect",
    {
      title: "Connect nodes",
      description: "Connect two existing nodes. By default expressed via the target node's `from`; falls back to an explicit edge when a label or tone is supplied.",
      inputSchema: ConnectInput.shape
    },
    async (params) => {
      const args = ConnectInput.parse(params);
      return withMutate("connect", args.diagramId, args, (diagram) => {
        const action: WireAction = {
          type: "edge.connect",
          edge: stripUndefined({
            id: args.id,
            from: args.from,
            to: args.to,
            branch: args.branch,
            label: args.label,
            tone: args.tone,
            fromHandle: args.fromHandle,
            toHandle: args.toHandle,
            style: args.style,
            labelStyle: args.labelStyle,
            routing: args.routing,
            data: args.data
          })
        };
        return applyWireAction(diagram, action, { validate: false, inverse: false }).diagram;
      });
    }
  );

  server.registerTool(
    "disconnect",
    {
      title: "Disconnect nodes",
      description: "Remove the connection between two nodes. When 'branch' is omitted, all edges from -> to are removed (including branched variants).",
      inputSchema: DisconnectInput.shape
    },
    async (params) => {
      const args = DisconnectInput.parse(params);
      return withMutate("disconnect", args.diagramId, args, (diagram) =>
        applyWireAction(
          diagram,
          { type: "edge.disconnect", from: args.from, to: args.to, branch: args.branch },
          { validate: false, inverse: false }
        ).diagram
      );
    }
  );

  server.registerTool(
    "update_edge",
    {
      title: "Update edge",
      description: "Patch an explicit edge by id. Use this to edit edge label, tone, fromHandle, toHandle, style, labelStyle, routing, markerStart/markerEnd, curvature, or data. Use null to clear a field.",
      inputSchema: UpdateEdgeInput.shape
    },
    async (params) => {
      const args = UpdateEdgeInput.parse(params);
      return withMutate("update_edge", args.diagramId, args, (diagram) =>
        applyWireAction(diagram, { type: "edge.patch", id: args.id, patch: args.patch }, { validate: false, inverse: false }).diagram
      );
    }
  );

  server.registerTool(
    "remove_edge",
    {
      title: "Remove edge",
      description: "Remove an explicit edge by id. For node `from` references, use disconnect instead.",
      inputSchema: RemoveEdgeInput.shape
    },
    async (params) => {
      const args = RemoveEdgeInput.parse(params);
      return withMutate("remove_edge", args.diagramId, args, (diagram) =>
        applyWireAction(diagram, { type: "edge.remove", id: args.id }, { validate: false, inverse: false }).diagram
      );
    }
  );

  server.registerTool(
    "add_note",
    {
      title: "Add note",
      description: "Add an annotation note. attachedTo associates the note visually with a node (no edge drawn).",
      inputSchema: AddNoteInput.shape
    },
    async (params) => {
      const args = AddNoteInput.parse(params);
      return withMutate("add_note", args.diagramId, args, (diagram) =>
        applyWireAction(
          diagram,
          {
            type: "note.add",
            note: stripUndefined({
              title: args.title,
              body: args.body,
              attachedTo: args.attachedTo,
              id: args.id,
              tone: args.tone
            })
          },
          { validate: false, inverse: false }
        ).diagram
      );
    }
  );

  server.registerTool(
    "set_layout",
    {
      title: "Set layout",
      description: "Change the layout direction (and optionally engine) of the diagram.",
      inputSchema: SetLayoutInput.shape
    },
    async (params) => {
      const args = SetLayoutInput.parse(params);
      return withMutate("set_layout", args.diagramId, args, (diagram) =>
        applyWireAction(
          diagram,
          { type: "layout.apply", direction: args.direction, engine: args.engine },
          { validate: false, inverse: false }
        ).diagram
      );
    }
  );

  server.registerTool(
    "add_group",
    {
      title: "Add group",
      description: "Add a group node and optionally parent existing child nodes under it.",
      inputSchema: AddGroupInput.shape
    },
    async (params) => {
      const args = AddGroupInput.parse(params);
      return withMutate("add_group", args.diagramId, args, (diagram) =>
        applyWireAction(
          diagram,
          {
            type: "group.add",
            group: stripUndefined({
              kind: "group" as const,
              id: args.id,
              title: args.title,
              description: args.description,
              position: args.position,
              size: args.size,
              style: args.style,
              data: args.data
            }),
            children: args.children
          },
          { validate: false, inverse: false }
        ).diagram
      );
    }
  );

  server.registerTool(
    "ungroup",
    {
      title: "Ungroup",
      description: "Remove group membership from a group node's children and clear the group children list. The group node remains in the diagram.",
      inputSchema: UngroupInput.shape
    },
    async (params) => {
      const args = UngroupInput.parse(params);
      return withMutate("ungroup", args.diagramId, args, (diagram) =>
        applyWireAction(diagram, { type: "group.ungroup", id: args.id }, { validate: false, inverse: false }).diagram
      );
    }
  );

  server.registerTool(
    "patch_metadata",
    {
      title: "Patch metadata",
      description: "Patch diagram.metadata without replacing unrelated metadata keys. Use null to clear a key.",
      inputSchema: PatchMetadataInput.shape
    },
    async (params) => {
      const args = PatchMetadataInput.parse(params);
      return withMutate("patch_metadata", args.diagramId, args, (diagram) =>
        applyWireAction(diagram, { type: "metadata.patch", patch: args.patch }, { validate: false, inverse: false }).diagram
      );
    }
  );

  server.registerTool(
    "apply_actions",
    {
      title: "Apply actions",
      description: "Apply a coherent batch of WireAction mutations atomically, then validate and save once. Use this for multi-step agent edits.",
      inputSchema: ApplyActionsInput.shape
    },
    async (params) => {
      const args = ApplyActionsInput.parse(params);
      const start = Date.now();
      try {
        let payload: {
          diagramId: string;
          diagram: WireDiagram;
          validation: ReturnType<typeof coreValidate>;
          changedNodeIds: string[];
          changedEdgeIds: string[];
        } | undefined;
        const saved = await storage.mutate(args.diagramId, async (diagram) => {
          const result = applyWireActions(diagram, args.actions as WireAction[]);
          payload = {
            diagramId: args.diagramId,
            diagram: result.diagram,
            validation: result.validation,
            changedNodeIds: result.changedNodeIds,
            changedEdgeIds: result.changedEdgeIds
          };
          return result.diagram;
        });
        await audit.log({
          tool: "apply_actions", actor: config.agentId, status: "ok",
          durationMs: Date.now() - start, diagramId: args.diagramId, params: args
        });
        return ok({ ...(payload ?? {
          diagramId: args.diagramId,
          validation: coreValidate(saved),
          changedNodeIds: [],
          changedEdgeIds: []
        }), diagram: saved });
      } catch (err) {
        await audit.log({
          tool: "apply_actions", actor: config.agentId, status: "error",
          durationMs: Date.now() - start, diagramId: args.diagramId, params: args,
          errorType: err instanceof Error ? err.constructor.name : "Error"
        });
        return fail(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "validate",
    {
      title: "Validate",
      description: "Run schema + structural validation on a diagram. Returns a list of issues with stable codes and repair hints.",
      inputSchema: ValidateInput.shape
    },
    async (params) => {
      const args = ValidateInput.parse(params);
      return withDiagram("validate", args.diagramId, args, (d) => coreValidate(d));
    }
  );

  server.registerTool(
    "get_diagram_json",
    {
      title: "Get diagram JSON",
      description: "Return the raw canonical Wire JSON for a diagram.",
      inputSchema: ValidateInput.shape
    },
    async (params) => {
      const args = ValidateInput.parse(params);
      return withDiagram("get_diagram_json", args.diagramId, args, (d) => d);
    }
  );

  server.registerTool(
    "render_svg",
    {
      title: "Render SVG",
      description: "Render the diagram to SVG. Returns text content the client can embed or save.",
      inputSchema: RenderInput.shape
    },
    async (params) => {
      const args = RenderInput.parse(params);
      return withDiagram("render_svg", args.diagramId, args, (d) => renderSvg(d).body);
    }
  );

  server.registerTool(
    "render_png",
    {
      title: "Render PNG",
      description: "Rasterize the diagram to PNG. Requires @resvg/resvg-js to be installed; otherwise returns SVG with a note.",
      inputSchema: RenderInput.shape
    },
    async (params) => {
      const args = RenderInput.parse(params);
      const start = Date.now();
      try {
        const diagram = await storage.load(args.diagramId);
        const result = await renderPng(diagram);
        await audit.log({
          tool: "render_png", actor: config.agentId, status: "ok",
          durationMs: Date.now() - start, diagramId: args.diagramId, params: args
        });
        if (result.bodyBase64) {
          return { content: [{ type: "image" as const, data: result.bodyBase64, mimeType: result.contentType }] };
        }
        return ok({ note: "PNG rasterizer not installed; install @resvg/resvg-js for PNG output. Returning SVG instead.", svg: result.body });
      } catch (err) {
        await audit.log({
          tool: "render_png", actor: config.agentId, status: "error",
          durationMs: Date.now() - start, diagramId: args.diagramId, params: args,
          errorType: err instanceof Error ? err.constructor.name : "Error"
        });
        return fail(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "render_preview",
    {
      title: "Render preview URL",
      description: "Return a URL that opens the diagram in a browser-renderable preview. Use the WIRE_PREVIEW_BASE env var (defaults to http://localhost:3870) to point at a deployed playground. The URL inlines the diagram JSON so it works without shared storage.",
      inputSchema: ValidateInput.shape
    },
    async (params) => {
      const args = ValidateInput.parse(params);
      return withDiagram("render_preview", args.diagramId, args, (d) => {
        const base = (process.env.WIRE_PREVIEW_BASE ?? "http://localhost:3870").replace(/\/$/, "");
        const json = JSON.stringify(d);
        const encoded = Buffer.from(json, "utf8").toString("base64url");
        const url = `${base}/preview/inline?d=${encoded}`;
        return { previewUrl: url, diagramId: args.diagramId, bytes: encoded.length };
      });
    }
  );

  server.registerTool(
    "summarize_diagram",
    {
      title: "Summarize diagram",
      description: "Return a plain-text summary (counts by kind, triggers, ends, branches).",
      inputSchema: ValidateInput.shape
    },
    async (params) => {
      const args = ValidateInput.parse(params);
      return withDiagram("summarize_diagram", args.diagramId, args, (d) => summarizeDiagram(d));
    }
  );

  server.registerTool(
    "export_mermaid",
    {
      title: "Export to Mermaid",
      description: "Convert a diagram to Mermaid `flowchart` syntax.",
      inputSchema: ValidateInput.shape
    },
    async (params) => {
      const args = ValidateInput.parse(params);
      return withDiagram("export_mermaid", args.diagramId, args, (d) => toMermaid(d));
    }
  );

  // ── resources ──────────────────────────────────────────────────────────

  // ── resources: wire://diagrams/{id}.{json,svg,png,mermaid} ────────────
  server.registerResource(
    "diagram-json",
    new ResourceTemplate("wire://diagrams/{id}.json", { list: undefined }),
    { title: "Wire diagram JSON", description: "Canonical Wire diagram as JSON." },
    async (uri, vars) => {
      const id = String(vars.id);
      const diagram = await storage.load(id);
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(diagram, null, 2) }] };
    }
  );

  server.registerResource(
    "diagram-svg",
    new ResourceTemplate("wire://diagrams/{id}.svg", { list: undefined }),
    { title: "Wire diagram SVG", description: "Server-rendered SVG of the diagram." },
    async (uri, vars) => {
      const id = String(vars.id);
      const diagram = await storage.load(id);
      const svg = renderSvg(diagram);
      return { contents: [{ uri: uri.href, mimeType: "image/svg+xml", text: svg.body }] };
    }
  );

  server.registerResource(
    "diagram-png",
    new ResourceTemplate("wire://diagrams/{id}.png", { list: undefined }),
    { title: "Wire diagram PNG", description: "PNG rasterization (requires @resvg/resvg-js; SVG fallback otherwise)." },
    async (uri, vars) => {
      const id = String(vars.id);
      const diagram = await storage.load(id);
      const png = await renderPng(diagram);
      if (png.bodyBase64) {
        return { contents: [{ uri: uri.href, mimeType: png.contentType, blob: png.bodyBase64 }] };
      }
      return { contents: [{ uri: uri.href, mimeType: "image/svg+xml", text: png.body }] };
    }
  );

  server.registerResource(
    "diagram-mermaid",
    new ResourceTemplate("wire://diagrams/{id}.mermaid", { list: undefined }),
    { title: "Wire diagram (Mermaid)", description: "Mermaid flowchart export of the diagram." },
    async (uri, vars) => {
      const id = String(vars.id);
      const diagram = await storage.load(id);
      return { contents: [{ uri: uri.href, mimeType: "text/x-mermaid", text: toMermaid(diagram) }] };
    }
  );

  server.registerResource(
    "diagram-preview",
    new ResourceTemplate("wire://diagrams/{id}/preview", { list: undefined }),
    {
      title: "Wire diagram preview URL",
      description: "Browser-renderable preview URL backed by the playground; used by CUA agents to visually verify the diagram."
    },
    async (uri, vars) => {
      const id = String(vars.id);
      const diagram = await storage.load(id);
      const base = (process.env.WIRE_PREVIEW_BASE ?? "http://localhost:3870").replace(/\/$/, "");
      const encoded = Buffer.from(JSON.stringify(diagram), "utf8").toString("base64url");
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: `${base}/preview/inline?d=${encoded}`
        }]
      };
    }
  );

  // ── resources: templates ───────────────────────────────────────────────
  server.registerResource(
    "templates-index",
    "wire://templates/",
    { title: "Wire templates index", description: "List of built-in diagram templates." },
    async (uri) => ({
      contents: [{
        uri: uri.href, mimeType: "application/json",
        text: JSON.stringify(listTemplates(), null, 2)
      }]
    })
  );

  server.registerResource(
    "template",
    new ResourceTemplate("wire://templates/{name}", { list: undefined }),
    { title: "Wire template", description: "A named built-in diagram template." },
    async (uri, vars) => {
      const name = String(vars.name);
      const tpl = getTemplate(name);
      if (!tpl) {
        throw new Error(`Template "${name}" not found. Known: ${Object.keys(TEMPLATES).join(", ")}.`);
      }
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(tpl, null, 2) }] };
    }
  );

  // ── resources: schema ──────────────────────────────────────────────────
  server.registerResource(
    "schema",
    "wire://schemas/wire-diagram",
    { title: "Wire diagram schema", description: "JSON schema for Wire diagrams (derived from Zod)." },
    async (uri) => {
      const schema = {
        $schema: "https://json-schema.org/draft-07/schema",
        $id: "https://aigentive.dev/schemas/wire-diagram.json",
        ...wireDiagramJsonSchema()
      };
      void WireDiagramSchema;
      return { contents: [{ uri: uri.href, mimeType: "application/schema+json", text: JSON.stringify(schema, null, 2) }] };
    }
  );

  // ── prompts ────────────────────────────────────────────────────────────

  for (const prompt of PROMPTS) {
    const argsShape = Object.fromEntries(
      prompt.arguments.map((a) => {
        const base = z.string().describe(a.description ?? "");
        return [a.name, a.required ? base : base.optional()];
      })
    );
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.name,
        description: prompt.description,
        argsSchema: argsShape
      },
      async (args: Record<string, string | undefined>) => {
        const filled = prompt.template.replace(/{{\s*(\w+)\s*}}/g, (_m, key) => args[key] ?? `{{${key}}}`);
        return {
          messages: [
            { role: "user", content: { type: "text", text: filled } }
          ]
        };
      }
    );
  }

  return { server, config, storage };
}

// ── transports ────────────────────────────────────────────────────────────

async function startStdio(handle: ServerHandle): Promise<void> {
  const transport = new StdioServerTransport();
  await handle.server.connect(transport);
  process.stderr.write(`[wire-mcp] stdio transport ready (storage=${handle.config.storageDir})\n`);
}

async function startHttp(handle: ServerHandle): Promise<void> {
  const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
  const { createServer: createHttpServer } = await import("node:http");
  const { randomUUID } = await import("node:crypto");

  type HttpSession = {
    transport: InstanceType<typeof StreamableHTTPServerTransport>;
    server: McpServer;
  };

  const transports = new Map<string, HttpSession>();
  const inflightConnects = new Map<string, Promise<InstanceType<typeof StreamableHTTPServerTransport>>>();

  async function acquireTransport(sessionId: string): Promise<InstanceType<typeof StreamableHTTPServerTransport>> {
    const existing = transports.get(sessionId);
    if (existing) return existing.transport;
    const inflight = inflightConnects.get(sessionId);
    if (inflight) return inflight;
    const pending = (async () => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
        enableJsonResponse: true
      });
      const session = createServer({ storage: handle.storage, config: handle.config });
      await session.server.connect(transport);
      transports.set(sessionId, { transport, server: session.server });
      // Best-effort cleanup so long-running cloud servers don't leak
      // transports per session.
      transport.onclose = () => {
        transports.delete(sessionId);
      };
      return transport;
    })();
    inflightConnects.set(sessionId, pending);
    try {
      return await pending;
    } finally {
      inflightConnects.delete(sessionId);
    }
  }

  const httpServer = createHttpServer(async (req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }
    if (req.url.startsWith("/health")) {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, server: "@aigentive/wire-mcp", storage: handle.config.storageDir, sessions: transports.size }));
      return;
    }
    if (req.url.startsWith("/ready")) {
      try {
        await handle.storage.list();
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ready: true }));
      } catch (err) {
        res.statusCode = 503;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ready: false, error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }
    if (req.url.startsWith("/mcp")) {
      const sessionId = (req.headers["mcp-session-id"] as string | undefined) ?? randomUUID();
      try {
        const transport = await acquireTransport(sessionId);
        await transport.handleRequest(req, res);
      } catch (err) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      }
      return;
    }
    res.statusCode = 404;
    res.end("Not found");
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(handle.config.httpPort, handle.config.httpHost, () => resolve());
  });
  process.stderr.write(
    `[wire-mcp] http transport ready on http://${handle.config.httpHost}:${handle.config.httpPort}/mcp (storage=${handle.config.storageDir})\n`
  );
}

async function main(): Promise<void> {
  const handle = createServer();
  if (handle.config.httpEnabled) {
    await startHttp(handle);
  } else {
    await startStdio(handle);
  }
}

// Detect direct CLI invocation safely across platforms (Windows path
// separators, symlinks, percent-encoded URLs). The string-suffix check
// from earlier versions could spuriously match when imported by another
// process whose entry point also ends in "server.js" — broken in Next.js
// app dirs.
async function isDirectRun(): Promise<boolean> {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const { pathToFileURL } = await import("node:url");
    return pathToFileURL(entry).href === import.meta.url;
  } catch {
    return false;
  }
}

if (await isDirectRun()) {
  main().catch((err) => {
    process.stderr.write(`[wire-mcp] fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });
}
