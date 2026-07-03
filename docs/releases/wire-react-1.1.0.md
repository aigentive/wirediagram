# @aigentive/wire-react 1.1.0

This minor release promotes the React package for production diagram reuse.

- Adds first-class package CSS via `@aigentive/wire-react/styles.css`.
- Extends current `WireWorkspace`, `WireCanvas`, `WireInspector`, panels, toolbar, palette, list, card, and group components with styling and theming controls.
- Adds canvas fit selection, large-diagram mode, simplified minimap behavior, and skip-to-inspector focus support.
- Moves wire-react performance validation to a browser performance harness using a production React bundle.
- Keeps `WireDiagram` and reducer actions as the durable state contract.
