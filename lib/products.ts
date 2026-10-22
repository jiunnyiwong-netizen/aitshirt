import "server-only";
import { supabasePublic } from "@/lib/supabase/public";
import type { PrintArea } from "@/lib/print-area";

export type Colour = { key: string; name: string; hex: string; mockup: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_sen: number;
  colours: Colour[];
  sizes: string[];
  print_area: PrintArea;
};

const COLUMNS = "id, slug, name, description, price_sen, colours, sizes, print_area";

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabasePublic()
    .from("products")
    .select(COLUMNS)
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data as Product[];
}

export async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabasePublic()
    .from("products")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data as Product | null;
}
