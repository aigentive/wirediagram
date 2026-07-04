# Wire Options Catalog Spec

This document describes the implemented options catalog surface in
`@aigentive/wire-react`.

## Contract

- `WireOptionSpec` describes one runtime option control.
- `WireOptionCatalog` groups option specs by node kind or `"*"`.
- Option catalogs are runtime UI configuration. They are not persisted in
  `WireDiagram`.
- Option values are persisted through canonical node patches.
- `WireProvider` remains catalog-free. Pass catalogs to `WireWorkspace`,
  `WireInspector`, `WireOptionPanel`, or `WireCanvas` as implemented by those
  components.

## Public Names

- `WireOptionSpec`
- `WireOptionCatalog`
- `WireOptionPanel`
- `WireInspector`
- `WireWorkspace`
- `WireCanvas`

Do not introduce versioned or parallel catalog names.

## Option Spec Shape

Supported field types:

- `text`
- `textarea`
- `number`
- `boolean`
- `select`

Common fields include `key`, `label`, `type`, `storage`, `description`,
`placeholder`, `defaultValue`, `readOnly`, `hidden`, `disabled`, `section`,
`required`, `parse`, `format`, and `validate`. Runtime function fields are not
serializable and must not be stored inside `WireDiagram`.

## Storage

Use `storage` to decide where option values live:

| Storage | Use when | Persisted location |
|---|---|---|
| `node` | The option maps to canonical node fields such as `model`, `ref`, `branches`, `tone`, `from`, `style`, or `data`. | Top-level node field |
| `data` | The option is consumer-defined but should live directly under `node.data`. | `node.data[key]` |
| omitted/default | The option is runtime configuration for a product surface. | `node.data.options[key]` |
| `metadata` | The option applies to diagram-level product metadata. | `diagram.metadata[key]` |

Store only JSON-serializable values in `WireDiagram`.

## Example

```ts
import type { WireOptionCatalog } from "@aigentive/wire-react";

export const supportCatalog: WireOptionCatalog = {
  "*": [
    { key: "notes", type: "textarea", label: "Notes" }
  ],
  ai: [
    { key: "model", storage: "node", type: "select", label: "Model", options: ["fast", "balanced", "careful"] },
    { key: "temperature", type: "number", label: "Temperature", min: 0, max: 2, step: 0.1 }
  ],
  tool: [
    { key: "ref", storage: "node", type: "text", label: "Tool reference", placeholder: "crm.search" }
  ],
  condition: [
    { key: "branches", storage: "node", type: "text", label: "Branches", placeholder: "yes,no" }
  ]
};
```

```tsx
<WireWorkspace
  diagram={diagram}
  onChange={setDiagram}
  optionCatalog={supportCatalog}
/>
```

## Component Responsibilities

- `WireWorkspace` passes `optionCatalog` into its owned inspector and canvas.
- `WireInspector` renders Configure, Style, Validation, JSON, and Edge tabs.
- `WireOptionPanel` renders the controls for a provided spec list.
- `WireCanvas` exposes the catalog in render context for custom node cards.

The Style tab owns title, description, tone, and visual appearance controls.
The Configure tab owns catalog-driven controls.

## Agent Guidance

Agents should patch persisted values, not catalog definitions. For example:

- Set node model labels with `node.patch` and `storage: "node"` specs.
- Set consumer runtime options under `data.options`.
- Set visual style through `tone`, `style`, `edge.style`, and `edge.labelStyle`.
- Validate after patches and repair by validation code.

## Tests And Gates

- `packages/wire-react/src/options.test.ts` covers option read/patch helpers.
- `packages/wire-react/src/components.test.tsx` covers option panel and
  inspector behavior.
- `npm run test:docs-snippets` checks docs mention `WireOptionSpec`,
  `WireOptionCatalog`, package CSS, `colorMode`, `unstyled`, and `classNames`.
- `npm run test:api-compat` checks public declaration names remain exported.
