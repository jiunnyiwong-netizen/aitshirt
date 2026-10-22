"use client";

import { useState } from "react";

type Answers = {
  ease_of_use: number | null;
  fair_price: number | null;
  would_buy_again: "yes" | "maybe" | "no" | null;
  comments: string;
};

export function FeedbackForm({ token }: { token: string }) {
  const [a, setA] = useState<Answers>({ ease_of_use: null, fair_price: null, would_buy_again: null, comments: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...a, comments: a.comments || null }),
    });
    setState(res.ok ? "sent" : "error");
  }

  if (state === "sent") {
    return <p className="rounded-lg bg-green-50 p-4 text-sm text-green-900">Thanks for the feedback! It really helps.</p>;
  }

  const answered = a.ease_of_use || a.fair_price || a.would_buy_again || a.comments.trim();
  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-white p-4 text-left">
      <div>
        <h2 className="font-semibold">Quick feedback (30 seconds)</h2>
        <p className="text-sm text-muted">We&apos;re a new shop. Your answers help us improve.</p>
      </div>
      <Scale
        label="How easy was it to design your shirt?"
        low="Hard"
        high="Very easy"
        value={a.ease_of_use}
        onChange={(v) => setA({ ...a, ease_of_use: v })}
      />
      <Scale
        label="Is the price fair?"
        low="Too high"
        high="Great value"
        value={a.fair_price}
        onChange={(v) => setA({ ...a, fair_price: v })}
      />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Would you buy from us again?</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["yes", "maybe", "no"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={a.would_buy_again === v}
              onClick={() => setA({ ...a, would_buy_again: v })}
              className={`h-11 rounded-lg border text-sm capitalize ${a.would_buy_again === v ? "border-ink bg-ink text-white" : "border-line"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Anything else? (optional)</span>
        <textarea
          value={a.comments}
          onChange={(e) => setA({ ...a, comments: e.target.value })}
          maxLength={2000}
          rows={3}
          className="w-full rounded-lg border border-line p-3 text-sm"
        />
      </label>
      {state === "error" && <p className="text-sm text-red-700">Sorry, that didn&apos;t send. Please try again.</p>}
      <button
        disabled={!answered || state === "sending"}
        className="h-12 w-full rounded-full bg-brand font-semibold text-white disabled:opacity-40"
      >
        {state === "sending" ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}

function Scale(props: { label: string; low: string; high: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{props.label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={props.value === n}
            onClick={() => props.onChange(n)}
            className={`h-11 rounded-lg border text-sm ${props.value === n ? "border-ink bg-ink text-white" : "border-line"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{props.low}</span>
        <span>{props.high}</span>
      </div>
    </fieldset>
  );
}
