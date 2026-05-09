import type { NextRequest } from "next/server";
import { signIn } from "@/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  await signIn("google", {
    redirectTo: normalizeCallbackPath(request.nextUrl.searchParams.get("callbackUrl"))
  });
  return new Response(null, { status: 204 });
}

function normalizeCallbackPath(value: string | null): string {
  if (!value) return "/playground";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/playground";
}
