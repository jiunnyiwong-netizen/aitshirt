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
    <Link href="/cart" className="relative flex h-11 items-center px-2 text-sm font-medium">
      Cart
      {count > 0 && (
        <span className="ml-1 rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">{count}</span>
      )}
    </Link>
  );
}
