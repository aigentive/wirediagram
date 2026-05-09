import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { auth, isGoogleAuthConfigured, signIn } from "@/auth";

export const metadata = {
  title: "Sign in - Wire",
  description: "Sign in to manage your Wire diagrams."
};

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps): Promise<ReactElement> {
  const params = await searchParams;
  const callbackUrl = normalizeCallbackPath(params?.callbackUrl);
  const session = await auth();
  if (session?.user?.email) redirect(callbackUrl);

  const configured = isGoogleAuthConfigured();

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 text-slate-950">
      <section className="grid w-full max-w-sm gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-1">
          <Link href="/" className="text-[13px] font-bold text-slate-500 no-underline hover:text-slate-950">
            Wire
          </Link>
          <h1 className="m-0 text-[24px] font-bold tracking-tight">Sign in</h1>
          <p className="m-0 text-[13px] leading-5 text-slate-600">
            Use Google to open your private wires workspace.
          </p>
        </div>

        {configured ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callbackUrl });
            }}
          >
            <button
              type="submit"
              className="h-10 w-full rounded-md bg-slate-950 px-4 text-[13px] font-bold text-white hover:bg-slate-800"
            >
              Continue with Google
            </button>
          </form>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] font-semibold leading-5 text-amber-800">
            Google auth is not configured. Set AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET in the deployment
            environment.
          </div>
        )}
      </section>
    </main>
  );
}

function normalizeCallbackPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return "/wires";
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  return "/wires";
}
