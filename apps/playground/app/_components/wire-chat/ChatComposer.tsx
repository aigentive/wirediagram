import { Loader2, Send } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  busy = false,
  placeholder,
  footerSlot
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
  footerSlot?: ReactNode;
}) {
  const trimmed = value.trim();
  const submitDisabled = busy || disabled || trimmed.length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled) return;
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-wire bg-wire-surface p-3"
    >
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!submitDisabled) onSubmit();
            }
          }}
          rows={3}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-[76px] flex-1 resize-none rounded-md border border-wire bg-wire-surface px-3 py-2 text-[13px] leading-5 text-wire-primary outline-none focus:border-wire-focus"
        />
        <button
          type="submit"
          disabled={submitDisabled}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-wire-sunken disabled:text-wire-muted"
          aria-label="Send"
          title="Send"
        >
          {busy ? (
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Send size={16} strokeWidth={1.5} />
          )}
        </button>
      </div>
      {footerSlot ? <div className="mt-2">{footerSlot}</div> : null}
    </form>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-sm bg-wire-sunken px-1 py-0.5 font-mono text-[11px] text-wire-primary">
      {children}
    </code>
  );
}
