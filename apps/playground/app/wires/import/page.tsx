import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/current-user";
import { resolvePublicShare } from "@/lib/share-links-store";
import { createUserWireFromDiagram } from "@/lib/wires-store";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    from?: string | string[];
  }>;
};

export default async function ImportWirePage({ searchParams }: PageProps): Promise<ReactElement> {
  const params = await searchParams;
  const token = normalizeToken(params?.from);
  if (!token) redirect("/wires");

  const session = await auth();
  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/wires/import?from=${token}`)}`);
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const share = await resolvePublicShare(token, "view");
  if (!share) redirect("/wires");

  const created = await createUserWireFromDiagram(user, share.diagram, {
    preserveId: false,
    summary: "Imported from public share."
  });
  redirect(`/wires/${encodeURIComponent(created.wire.id)}`);
}

function normalizeToken(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;
  return /^[A-Za-z0-9_-]{8,96}$/.test(candidate) ? candidate : null;
}
