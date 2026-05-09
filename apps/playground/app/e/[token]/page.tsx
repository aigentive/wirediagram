import { notFound } from "next/navigation";
import { resolvePublicShare, shareUrls } from "@/lib/share-links-store";
import { EditCanvas } from "../../edit/canvas";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicEditPage({ params }: PageProps) {
  const { token } = await params;
  const share = await resolvePublicShare(token, "edit");
  if (!share?.record) notFound();

  const viewToken = share.record.viewToken ?? share.record.token;
  const urls = shareUrls("", {
    viewToken,
    editToken: share.record.token,
    wireId: share.record.wireId
  });

  return (
    <EditCanvas
      diagram={JSON.parse(JSON.stringify(share.diagram))}
      label={share.diagram.title ?? "shared wire"}
      shareToken={share.record.token}
      initialPreviewHref={urls.view}
      importHref={`/wires/import?from=${encodeURIComponent(viewToken)}`}
      banner="You're editing a shared wire. Sign in to save a copy to your workspace."
    />
  );
}
