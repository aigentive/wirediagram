import type { ReactNode } from "react";
import { ChatRoleLabel, type ChatRole } from "./ChatRoleLabel";

export function ChatBubble({
  role,
  children,
  cost,
  headingAddon
}: {
  role: ChatRole;
  children: ReactNode;
  cost?: ReactNode;
  headingAddon?: ReactNode;
}) {
  const assistant = role === "assistant";
  const wrapperClass = assistant
    ? "flex flex-col items-start max-w-[88%]"
    : "ml-auto flex flex-col items-end max-w-[88%]";
  const bubbleClass = assistant
    ? "rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[3px] border border-wire bg-wire-surface px-[13px] py-[10px] text-[12.5px] leading-[1.55] text-wire-secondary shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    : "rounded-tl-[12px] rounded-tr-[12px] rounded-br-[3px] rounded-bl-[12px] px-[13px] py-[10px] text-[12.5px] leading-[1.55] text-white";
  const userStyle = assistant
    ? undefined
    : {
        backgroundImage:
          "linear-gradient(180deg, var(--wire-chat-user-from) 0%, var(--wire-chat-user-to) 100%)",
        boxShadow: "var(--wire-chat-user-shadow)"
      };
  return (
    <div className={wrapperClass}>
      <ChatRoleLabel role={role}>{headingAddon}</ChatRoleLabel>
      <div className={bubbleClass} style={userStyle}>
        {children}
        {cost ?? null}
      </div>
    </div>
  );
}
