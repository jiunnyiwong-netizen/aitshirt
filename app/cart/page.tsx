"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckoutButton } from "@/components/cart/CheckoutButton";
import { useCart } from "@/lib/cart/store";
import { formatRM } from "@/lib/money";

export default function CartPage() {
  const { items, setQuantity, remove } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <p>Your cart is empty.</p>
        <Link href="/" className="underline">Choose a shirt</Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPriceSen * i.quantity, 0);
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">Your cart</h1>
      <ul className="divide-y divide-line">
        {items.map((i) => (
          <li key={`${i.designId}-${i.size}`} className="flex gap-3 py-3">
            <img src={i.thumbnail} alt="" className="h-24 w-24 rounded-lg border border-line object-cover" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">{i.productName}</p>
              <p className="text-muted">{i.colourName} · {i.size}</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" aria-label="One fewer" className="h-9 w-9 rounded border" onClick={() => setQuantity(i.designId, i.size, i.quantity - 1)}>−</button>
                <span className="w-6 text-center">{i.quantity}</span>
                <button type="button" aria-label="One more" className="h-9 w-9 rounded border" onClick={() => setQuantity(i.designId, i.size, i.quantity + 1)}>+</button>
                <button type="button" className="ml-auto text-muted underline" onClick={() => remove(i.designId, i.size)}>Remove</button>
              </div>
            </div>
            <p className="text-sm font-semibold">{formatRM(i.unitPriceSen * i.quantity)}</p>
          </li>
        ))}
      </ul>
      <div className="flex justify-between font-semibold">
        <span>Subtotal</span>
        <span>{formatRM(subtotal)}</span>
      </div>
      <p className="text-xs text-muted">Shipping is added at checkout: RM 8.00 Peninsular, RM 15.00 Sabah, Sarawak and Labuan.</p>
      <CheckoutButton />
    </div>
  );
}
