"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount, useCart } from "@/lib/cart/store";

export function CartLink() {
  const items = useCart((s) => s.items);
  // The cart lives in localStorage, so render the count only after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? cartCount(items) : 0;
  return (
    <Link href="/cart" className="flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-white">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      Cart
      {count > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-white">{count}</span>}
    </Link>
  );
}
