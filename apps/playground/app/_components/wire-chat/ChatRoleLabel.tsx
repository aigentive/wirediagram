export type ChatRole = "user" | "assistant";

export function ChatRoleLabel({ role }: { role: ChatRole }) {
  const isUser = role === "user";
  const dotClass = isUser ? "bg-white/80" : "bg-wire-muted";
  const textClass = isUser
    ? "wire-eyebrow text-white/80"
    : "wire-eyebrow wire-eyebrow--muted";
  const label = isUser ? "You" : "Assistant";
  return (
    <div className="mb-1 flex items-center gap-1.5">
      <span
        aria-hidden
        className={`inline-block h-1 w-1 rounded-full ${dotClass}`}
      />
      <span className={textClass}>{label}</span>
    </div>
  );
}
