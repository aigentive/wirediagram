import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/current-user";
import { listUserWires } from "@/lib/wires-store";
import { WiresClient } from "../WiresClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WireWorkspacePage({ params }: PageProps): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) redirect("/wires");

  const wires = await listUserWires(user);
  return (
    <WiresClient
      user={{
        email: user.email,
        name: user.name,
        image: user.image
      }}
      initialWires={wires}
      initialActiveWireId={id}
    />
  );
}
