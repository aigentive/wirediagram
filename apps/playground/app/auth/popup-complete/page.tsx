import type { ReactElement } from "react";
import { PopupCompleteClient } from "./PopupCompleteClient";

export const metadata = {
  title: "Finishing sign in - Wire",
  description: "Finish Google sign in and return to Wire."
};

type PopupCompletePageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

export default async function PopupCompletePage({ searchParams }: PopupCompletePageProps): Promise<ReactElement> {
  const params = await searchParams;
  return <PopupCompleteClient next={normalizeNextPath(params?.next)} />;
}

function normalizeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return "/playground";
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  return "/playground";
}
