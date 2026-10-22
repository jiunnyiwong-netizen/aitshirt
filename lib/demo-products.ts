import type { Product } from "@/lib/products";

// Used when DEMO_MODE=true, so the shop can be previewed without Supabase.
// Matches supabase/seed.sql.
const colours = [
  { key: "white", name: "White", hex: "#f4f4f1", mockup: "/mockups/white.png" },
  { key: "black", name: "Black", hex: "#1c1c1c", mockup: "/mockups/black.png" },
  { key: "navy", name: "Navy", hex: "#1f2a44", mockup: "/mockups/navy.png" },
];
const sizes = ["S", "M", "L", "XL", "XXL", "3XL"];
const print_area = { mockup_width: 1000, mockup_height: 1000, x: 350, y: 230, width: 300, height: 424 };

export const DEMO_PRODUCTS: Product[] = [
  { id: "00000000-0000-4000-8000-000000000001", slug: "classic-crew-tee", name: "Classic Crew Tee", description: "Soft combed cotton, regular fit. Your photo printed on the front.", price_sen: 7900, colours, sizes, print_area },
  { id: "00000000-0000-4000-8000-000000000002", slug: "oversized-tee", name: "Oversized Tee", description: "Dropped shoulders and a relaxed boxy fit.", price_sen: 7900, colours, sizes, print_area },
  { id: "00000000-0000-4000-8000-000000000003", slug: "heavyweight-tee", name: "Heavyweight Tee", description: "Thick 240gsm cotton that keeps its shape.", price_sen: 7900, colours, sizes, print_area },
];
