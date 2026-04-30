import type { ReactNode } from "react";
import { ChatRoleLabel, type ChatRole } from "./ChatRoleLabel";

export function ChatBubble({
  role,
  children,
  cost
}: {
  role: ChatRole;
  children: ReactNode;
  cost?: ReactNode;
}) {
  const assistant = role === "assistant";
  const wrapperClass = assistant
    ? "mr-auto max-w-[80%]"
    : "ml-auto max-w-[80%]";
  const bubbleClass = assistant
    ? "rounded-lg border border-wire bg-wire-surface p-3 text-[13px] leading-5 text-wire-secondary"
    : "rounded-lg p-3 text-[13px] font-medium leading-5 text-white";
  const userStyle = assistant
    ? undefined
    : {
        backgroundColor: "var(--wire-chat-user-from)",
        boxShadow: "var(--wire-chat-user-shadow)"
      };
  return (
    <div className={wrapperClass}>
      <div className={bubbleClass} style={userStyle}>
        <ChatRoleLabel role={role} />
        {children}
        {cost ?? null}
      </div>
    </div>
  );
}
