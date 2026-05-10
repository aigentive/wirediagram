import { Loader2, Send } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { LLM_MODEL_IDS, type LlmModelId } from "@/lib/llm-cost";

const TEXTAREA_MIN_HEIGHT = 48;
const TEXTAREA_MAX_HEIGHT = 250;

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    syncTextareaHeight(textarea);
  }, [value]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled) return;
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-wire bg-wire-surface px-3 pb-[10px] pt-2"
    >
      <div className="flex items-end gap-1.5 rounded-[9px] border border-wire bg-wire-page py-[6px] pl-[12px] pr-[6px] transition-colors focus-within:border-wire-focus focus-within:bg-wire-surface focus-within:shadow-[0_0_0_2px_rgba(37,99,235,0.12)]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            syncTextareaHeight(event.currentTarget);
            onChange(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!submitDisabled) onSubmit();
            }
          }}
          rows={2}
          disabled={disabled}
          placeholder={placeholder}
          className="max-h-[250px] min-h-[48px] flex-1 resize-none overflow-y-hidden border-0 bg-transparent py-[5px] text-[13px] leading-[1.45] text-wire-primary outline-none placeholder:text-wire-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitDisabled}
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[7px] bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-wire-sunken disabled:text-wire-muted"
          aria-label="Send"
          title="Send"
        >
          {busy ? (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Send size={14} strokeWidth={1.5} />
          )}
        </button>
      </div>
      {footerSlot ? <div className="mt-[6px]">{footerSlot}</div> : null}
    </form>
  );
}

function syncTextareaHeight(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, TEXTAREA_MIN_HEIGHT), TEXTAREA_MAX_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-sm bg-wire-sunken px-1 py-0.5 font-mono text-[11px] text-wire-primary">
      {children}
    </code>
  );
}

export function ChatModelFooter({
  model,
  onModelChange,
  disabled = false
}: {
  model: LlmModelId;
  onModelChange: (model: LlmModelId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-wire-tertiary">
      <label className="flex min-w-0 items-center gap-1.5">
        <span className="wire-eyebrow wire-eyebrow--muted">Model:</span>
        <select
          value={model}
          onChange={(event) => onModelChange(event.currentTarget.value as LlmModelId)}
          disabled={disabled}
          className="h-6 max-w-[180px] rounded-md border border-wire bg-wire-page px-2 font-mono text-[11px] font-bold text-wire-primary outline-none transition-colors hover:border-wire-strong focus:border-wire-focus disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Model"
        >
          {LLM_MODEL_IDS.map((modelId) => (
            <option key={modelId} value={modelId}>
              {modelId}
            </option>
          ))}
        </select>
      </label>
      <span className="text-wire-muted">·</span>
      <span className="wire-eyebrow wire-eyebrow--muted">Wire MCP</span>
      <InlineCode>local</InlineCode>
      <span className="ml-auto flex items-center gap-1.5">
        <InlineCode>↵</InlineCode>
        send
        <span className="text-wire-muted">·</span>
        <InlineCode>⇧↵</InlineCode>
        newline
      </span>
    </div>
  );
}
