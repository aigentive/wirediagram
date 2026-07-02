import { auth } from "@/auth";
import { createHmac } from "node:crypto";
import { requireAppSecret } from "@/lib/app-secret";
import { recordAuthenticatedUser } from "@/lib/activity-store";

export type CurrentUser = {
  key: string;
  email: string;
  name: string | null;
  image: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const user = {
    key: userStorageKey(email),
    email,
    name: session.user.name ?? null,
    image: session.user.image ?? null
  };
  await recordAuthenticatedUser(user, { source: "session" });
  return user;
}

export async function requireCurrentUser(): Promise<CurrentUser | Response> {
  const user = await getCurrentUser();
  if (user) return user;
  return Response.json({ error: "Authentication required." }, { status: 401 });
}

function userStorageKey(email: string): string {
  const secret = requireAppSecret("User storage keys");
  return createHmac("sha256", secret).update(email.toLowerCase()).digest("base64url").slice(0, 32);
}
