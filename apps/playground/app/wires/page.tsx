import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/current-user";
import { resolvePublicShare } from "@/lib/share-links-store";
import { createUserWireFromDiagram, listUserWires } from "@/lib/wires-store";
import { WiresClient } from "./WiresClient";

export const metadata = {
  title: "Wires - Wire",
  description: "Manage and iterate on your Wire diagrams."
};

export const dynamic = "force-dynamic";

type WiresPageProps = {
  searchParams?: Promise<{
    import?: string | string[];
    wire?: string | string[];
  }>;
};

export default async function WiresPage({ searchParams }: WiresPageProps): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const importToken = normalizeShareToken(params?.import);
  if (importToken) {
    const imported = await resolvePublicShare(importToken, "view");
    if (imported) {
      const created = await createUserWireFromDiagram(user, imported.diagram, {
        preserveId: false,
        summary: "Imported from public share."
      });
      redirect(`/wires/${encodeURIComponent(created.wire.id)}`);
    }
  }

  const wires = await listUserWires(user);
  const initialActiveWireId = normalizeWireId(params?.wire);

  return (
    <WiresClient
      user={{
        email: user.email,
        name: user.name,
        image: user.image
      }}
      initialWires={wires}
      initialActiveWireId={initialActiveWireId}
    />
  );
}

function normalizeWireId(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;
  return /^[A-Za-z0-9_-]+$/.test(candidate) ? candidate : null;
}

function normalizeShareToken(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;
  return /^[A-Za-z0-9_-]{8,96}$/.test(candidate) ? candidate : null;
}
