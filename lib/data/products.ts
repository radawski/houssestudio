import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Product, ProductCategory } from "@/lib/supabase/database.types";

export type CategoryWithProducts = ProductCategory & { products: Product[] };

/**
 * El catálogo de productos completo, por categoría: categorías en su orden y
 * productos por nombre. Va por la sesión del admin (RLS), como el resto del
 * panel.
 */
export async function getProductCatalog(): Promise<CategoryWithProducts[]> {
  const supabase = await createClient();

  const [categories, products] = await Promise.all([
    supabase.from("product_categories").select("*").order("sort_order").order("name"),
    supabase.from("products").select("*").order("name"),
  ]);

  if (categories.error) throw new Error(`No se pudieron leer las categorías: ${categories.error.message}`);
  if (products.error) throw new Error(`No se pudieron leer los productos: ${products.error.message}`);

  return categories.data.map((category) => ({
    ...category,
    products: products.data.filter((product) => product.category_id === category.id),
  }));
}
