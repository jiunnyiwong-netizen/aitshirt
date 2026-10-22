"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/store";

// Empties the cart once the customer is back from a successful checkout.
export function ClearCart() {
  const clear = useCart((s) => s.clear);
  useEffect(() => clear(), [clear]);
  return null;
}
