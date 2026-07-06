"use client";

import { useState, type FormEvent } from "react";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { DocsPage } from "../_components/DocsPage";
import { Callout } from "../_components/Callout";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "ok" }
  | { status: "error"; message: string };

export default function ContactPage() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;

    setState({ status: "submitting" });
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: data
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = typeof body.error === "string" ? body.error : "Something went wrong. Please try again.";
        setState({ status: "error", message });
        return;
      }

      setState({ status: "ok" });
      form.reset();
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <DocsPage
      eyebrow="Contact"
      title="Get in touch"
      description="Questions about Wire, integration help, or feedback on the docs — drop us a line."
      crumbs={[{ href: "/docs", label: "Docs" }, { label: "Contact" }]}
      showToc={false}
    >
      {state.status === "ok" ? (
        <Callout tone="tip" title="Message sent">
          <p className="m-0">Thanks — we&rsquo;ll get back to you shortly.</p>
          <button
            type="button"
            onClick={() => setState({ status: "idle" })}
            className="mt-2 text-[13px] font-bold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
          >
            Send another
          </button>
        </Callout>
      ) : null}

      {state.status === "error" ? (
        <Callout tone="warn" title="Could not send">
          <p className="m-0 flex items-start gap-2">
            <AlertCircle size={14} aria-hidden className="mt-0.5 shrink-0" />
            <span>{state.message}</span>
          </p>
        </Callout>
      ) : null}

      <form onSubmit={handleSubmit} className="not-prose grid gap-4 rounded-lg border border-wire bg-wire-surface p-6">
        <div className="grid gap-1.5">
          <label htmlFor="name" className="text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-950 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-600"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="email" className="text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-950 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-600"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="subject" className="text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            placeholder="What's this about?"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-950 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-600"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="message" className="text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            placeholder="Tell us what you need…"
            className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[12px] text-wire-tertiary">
            <Mail size={12} aria-hidden strokeWidth={1.5} />
            We&rsquo;ll reply to the email above.
          </span>
          <button
            type="submit"
            disabled={state.status === "submitting"}
            className="flex items-center gap-1.5 rounded-md bg-slate-950 px-4 py-2 text-[13px] font-bold text-slate-50 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {state.status === "submitting" ? (
              <>Sending…</>
            ) : (
              <>
                <Send size={13} aria-hidden strokeWidth={1.5} />
                Send message
              </>
            )}
          </button>
        </div>
      </form>

      <Callout tone="info" title="Other channels">
        <ul className="m-0 grid gap-1 pl-5 text-[14px] leading-6">
          <li>
            <CheckCircle2 size={12} aria-hidden className="-mt-0.5 mr-1 inline" />
            Bug reports and feature requests live in the GitHub repo (link in the header).
          </li>
          <li>
            <CheckCircle2 size={12} aria-hidden className="-mt-0.5 mr-1 inline" />
            Use this form for partnership questions, integration help, or docs feedback.
          </li>
        </ul>
      </Callout>
    </DocsPage>
  );
}
