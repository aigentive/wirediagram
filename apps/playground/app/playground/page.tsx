import { INITIAL_PLAYGROUND_DIAGRAM } from "./initial-diagram";
import { PlaygroundClient } from "./PlaygroundClient";

export const metadata = {
  title: "Wire Playground",
  description: "Chat with an LLM that updates editable Wire JSON through MCP-style tools."
};

export default function PlaygroundPage() {
  return <PlaygroundClient initialDiagram={INITIAL_PLAYGROUND_DIAGRAM} />;
}
