import { notFound, redirect } from "next/navigation";
import { renderToSvg } from "@aigentive/wire-core";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/current-user";
import { loadUserWire } from "@/lib/wires-store";
import { PreviewCanvas } from "../../../preview/canvas";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WireWorkspacePreviewPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const loaded = await loadUserWire(user, id);
  if (!loaded) notFound();

  return (
    <PreviewCanvas
      svg={renderToSvg(loaded.diagram)}
      label={loaded.wire.title}
      editHref={`/wires/${encodeURIComponent(loaded.wire.id)}`}
    />
  );
}
