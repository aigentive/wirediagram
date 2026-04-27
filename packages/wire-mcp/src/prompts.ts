/**
 * MCP prompt templates for Wire. These are reusable agent-side instructions
 * — the MCP client surfaces them to the LLM as quick-action prompts.
 */
export const PROMPTS = [
  {
    name: "diagram_from_codebase",
    description: "Generate a Wire diagram describing the architecture of a codebase using `add_node`/`connect`.",
    arguments: [
      { name: "rootPath", description: "Absolute path to the repo or directory to summarize.", required: true },
      { name: "diagramId", description: "Diagram id to write the result into. If absent, a new one is created.", required: false }
    ],
    template: `You are summarizing a codebase as a Wire architecture diagram.

1. Inspect {{rootPath}} and identify the primary modules, data flows, and external services.
2. Call \`create_diagram\` (or \`load_diagram\` if {{diagramId}} is provided) and use \`set_layout\` for the best direction.
3. Use \`add_node\` for each major module with the right kind:
   - "trigger" for external entry points (HTTP, queue, cron)
   - "ai" for LLM calls
   - "tool" for outbound integrations
   - "memory" for persistent stores
   - "retrieval" for search/embedding services
   - "guardrail" for validators
   - "action" for outbound effects
   - "end" for terminal states
4. Wire connections via \`connect\` using the canonical "from" semantics. Prefer linear chains; only use \`condition\` nodes when the data path actually branches.
5. Add 1-3 \`add_note\` callouts for non-obvious risks or assumptions.
6. Call \`validate\` and fix any errors before returning.
7. Render with \`render_svg\` so the user can see the result.`
  },
  {
    name: "diagram_from_logs",
    description: "Reconstruct a workflow diagram from a sample of structured logs.",
    arguments: [
      { name: "logSample", description: "Multi-line log sample. JSON or text.", required: true }
    ],
    template: `Reconstruct the workflow that produced these logs as a Wire diagram.

Logs:
\`\`\`
{{logSample}}
\`\`\`

Steps:
1. Identify each distinct stage by ordered timestamps and stage labels.
2. Use \`create_diagram\` then \`add_node\` per stage.
3. Add \`condition\` nodes when log lines indicate a fork (different downstream stages).
4. Mark the final stage with kind="end".
5. Call \`validate\` and \`render_svg\`.`
  },
  {
    name: "diagram_from_workflow_description",
    description: "Build a diagram from a plain-English workflow description.",
    arguments: [
      { name: "description", description: "Free-form workflow narrative.", required: true }
    ],
    template: `Convert this workflow description into a Wire diagram:

{{description}}

Use add_node + connect via canonical "from" syntax. Add condition nodes for any "if/then/else" language. Add notes for explicit constraints. Validate and render at the end.`
  },
  {
    name: "review_diagram_for_clarity",
    description: "Critique an existing diagram for ambiguity, missing branches, or layout issues.",
    arguments: [
      { name: "diagramId", description: "Diagram id to load and review.", required: true }
    ],
    template: `Load diagram {{diagramId}} via \`load_diagram\` and critique it for clarity.

Specifically check:
- Are there orphan nodes or dangling references? (run \`validate\`)
- Do condition nodes cover every realistic outcome?
- Are tones (success/warning/error) used consistently?
- Are notes attached to the right host?

Suggest concrete edits. Do NOT mutate the diagram unless explicitly asked.`
  },
  {
    name: "simplify_diagram",
    description: "Refactor a diagram for clarity — collapse redundant nodes, normalize kinds, tighten labels.",
    arguments: [
      { name: "diagramId", description: "Diagram id.", required: true }
    ],
    template: `Load diagram {{diagramId}} and simplify it.

Heuristics:
- Two adjacent nodes of the same kind doing essentially the same thing → merge.
- Strings > 60 chars in titles → shorten to action verbs.
- Unused branches on condition nodes → remove if no downstream consumer.
- Notes that duplicate node descriptions → drop.

Apply edits via \`update_node\`, \`remove_node\`, \`disconnect\`. Re-validate after.`
  }
];
