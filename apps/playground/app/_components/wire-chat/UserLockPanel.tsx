import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";

export function UserLockPanel({
  busy,
  onSaveKey,
  title = "Free chat limit reached",
  description = "Add your OpenAI API key to keep chatting. Stored encrypted on your account.",
  submitLabel = "Save and continue",
  autoFocus = false
}: {
  busy: boolean;
  onSaveKey: (key: string) => Promise<string | null>;
  title?: string;
  description?: string;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const trimmed = draft.trim();
  const valid = trimmed.startsWith("sk-") && trimmed.length > 20;
  return (
    <section className="grid gap-2.5 border-t border-wire bg-wire-page px-4 py-3">
      <header className="flex items-start gap-2">
        <KeyRound size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-wire-tertiary" />
        <div className="grid gap-0.5">
          <h3 className="m-0 text-[13px] font-bold text-wire-primary">{title}</h3>
          <p className="m-0 text-[12px] leading-[1.45] text-wire-secondary">
            {description}
          </p>
        </div>
      </header>
      <form
        className="grid gap-1.5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!valid || saving || busy) return;
          setSaving(true);
          setError(null);
          const errorMessage = await onSaveKey(trimmed);
          setSaving(false);
          if (errorMessage) {
            setError(errorMessage);
            return;
          }
          setDraft("");
        }}
      >
        <label className="grid gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-wire-tertiary">OpenAI API key</span>
          <input
            type="password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="sk-..."
            spellCheck={false}
            autoComplete="off"
            autoFocus={autoFocus}
            disabled={saving}
            className="h-8 rounded-md border border-wire bg-wire-surface px-2 font-mono text-[12px] text-wire-primary outline-none placeholder:text-wire-muted focus:border-wire-focus disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={!valid || saving || busy}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-[13px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-wire-sunken disabled:text-wire-muted"
        >
          {saving ? <Loader2 size={13} strokeWidth={1.5} className="animate-spin" /> : null}
          {submitLabel}
        </button>
        {error ? (
          <p className="m-0 text-[11px] font-semibold leading-[1.4] text-wire-status-invalid">{error}</p>
        ) : null}
      </form>
    </section>
  );
}

export function StoredKeyFooterPanel({
  last4,
  onClear
}: {
  last4: string | null;
  onClear: () => void;
}) {
  return (
    <section className="flex items-center gap-2 border-t border-wire bg-wire-page px-4 py-2 text-[12px] font-semibold text-wire-secondary">
      <KeyRound size={13} strokeWidth={1.5} className="shrink-0 text-wire-tertiary" />
      <span>Using your OpenAI key{last4 ? ` (····${last4})` : ""}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex h-7 items-center rounded-md border border-wire bg-wire-surface px-2 text-[11px] font-bold text-wire-secondary hover:border-wire-strong hover:text-wire-primary"
      >
        Remove
      </button>
    </section>
  );
}
