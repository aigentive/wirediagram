export function Avatar({
  name,
  email,
  size = 24
}: {
  name?: string | null;
  email?: string | null;
  size?: number;
}) {
  const initials = computeInitials(name, email);
  return (
    <span
      aria-hidden
      className="wire-tabular grid shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-bold uppercase text-white"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

export function shortName(
  name: string | null | undefined,
  email?: string | null | undefined
): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/u);
    if (parts.length === 1) return parts[0]!;
    const first = parts[0]!;
    const lastInitial = (parts[parts.length - 1]![0] ?? "").toUpperCase();
    return lastInitial ? `${first} ${lastInitial}.` : first;
  }
  return (email ?? "").trim();
}

function computeInitials(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/u);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return ((parts[0]![0] ?? "") + (parts[1]![0] ?? "")).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.trim().slice(0, 2).toUpperCase();
  }
  return "?";
}
