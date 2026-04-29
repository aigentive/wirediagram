import { parseWireDiagram, type WireDiagram } from "@aigentive/wire-core";
import { redirect } from "next/navigation";
import { auth, isGoogleAuthConfigured } from "@/auth";
import { resolveShareToken } from "@/lib/share-store";
import { INITIAL_PLAYGROUND_DIAGRAM } from "./initial-diagram";
import { PlaygroundClient } from "./PlaygroundClient";

export const metadata = {
  title: "Wire Playground",
  description: "Chat with an LLM that updates editable Wire JSON through MCP-style tools."
};

export const dynamic = "force-dynamic";

const TOKEN_RE = /^[A-Za-z0-9_-]{8,16}$/;

interface PageProps {
  searchParams: Promise<{ d?: string }>;
}

export default async function PlaygroundPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.user?.email) redirect("/wires");

  const { d } = await searchParams;
  let initialDiagram: WireDiagram = INITIAL_PLAYGROUND_DIAGRAM;
  let initialToken: string | null = null;

  if (d && TOKEN_RE.test(d)) {
    const json = await resolveShareToken(d);
    if (json) {
      try {
        initialDiagram = parseWireDiagram(json);
        initialToken = d;
      } catch {
        // fall through to seed
      }
    }
  }

  const serializableDiagram = JSON.parse(JSON.stringify(initialDiagram)) as WireDiagram;

  return (
    <PlaygroundClient
      initialDiagram={serializableDiagram}
      initialToken={initialToken}
      isAuthenticated={Boolean(session?.user?.email)}
      googleAuthConfigured={isGoogleAuthConfigured()}
    />
  );
}
