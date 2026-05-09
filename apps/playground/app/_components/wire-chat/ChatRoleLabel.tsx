export type ChatRole = "user" | "assistant";

export function ChatRoleLabel({ role }: { role: ChatRole }) {
  const isUser = role === "user";
  const label = isUser ? "You" : "Assistant";
  return (
    <div className="mb-[5px] flex items-center gap-[5px]">
      <span aria-hidden className="inline-block h-[5px] w-[5px] rounded-full bg-wire-muted" />
      <span className="wire-eyebrow wire-eyebrow--muted">{label}</span>
    </div>
  );
}
