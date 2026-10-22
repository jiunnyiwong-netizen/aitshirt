"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  designId: string;
  productId: string;
  slug: string;
  productName: string;
  colour: string;
  colourName: string;
  size: string;
  quantity: number;
  unitPriceSen: number; // shown only; the server recalculates at checkout
  thumbnail: string; // small JPEG data URL of the preview
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQuantity: (designId: string, size: string, quantity: number) => void;
  remove: (designId: string, size: string) => void;
  clear: () => void;
};

const MAX_QTY = 20;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.designId === item.designId && i.size === item.size);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i === existing ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + item.quantity) } : i,
              ),
            };
          }
          return { items: [...s.items, item] };
        }),
      setQuantity: (designId, size, quantity) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.designId === designId && i.size === size
              ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) }
              : i,
          ),
        })),
      remove: (designId, size) =>
        set((s) => ({ items: s.items.filter((i) => !(i.designId === designId && i.size === size)) })),
      clear: () => set({ items: [] }),
    }),
    { name: "tee-cart" },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
