"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/store";

export function CheckoutButton() {
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ designId: i.designId, size: i.size, quantity: i.quantity })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // A design that expired or was made on another device can't be bought; drop it.
        if (res.status === 409 && json.designId) {
          items.filter((i) => i.designId === json.designId).forEach((i) => remove(i.designId, i.size));
        }
        throw new Error(json.error ?? "Checkout failed");
      }
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button
        type="button"
        onClick={checkout}
        disabled={busy || items.length === 0}
        className="h-12 w-full rounded-full bg-brand font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Opening secure checkout…" : "Checkout"}
      </button>
      <p className="text-center text-xs text-muted">Pay by card or FPX online banking. Payments are handled by Stripe.</p>
    </div>
  );
}
