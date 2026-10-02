import "server-only";

import { getActiveServices } from "@/lib/data/appointments";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductCategory } from "@/lib/supabase/database.types";

export type CategoryWithProducts = ProductCategory & { products: Product[] };

type CatalogItem = { id: string; name: string; price: number };

/** El catálogo de la venta suelta (ver `getSaleCatalog`). */
export type SaleCatalog = {
  services: CatalogItem[];
  /** Categorías de productos con sus productos activos, en su orden. */
  categories: { id: string; name: string; products: CatalogItem[] }[];
};

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

/**
 * Lo que se puede vender en la venta suelta: los servicios activos (la
 * categoría "Cortes") y los productos activos de cada categoría. Las
 * categorías sin productos activos no se incluyen.
 */
export async function getSaleCatalog(): Promise<SaleCatalog> {
  const [services, catalog] = await Promise.all([getActiveServices(), getProductCatalog()]);
  return {
    services,
    categories: catalog
      .map((category) => ({
        id: category.id,
        name: category.name,
        products: category.products
          .filter((product) => product.is_active)
          .map(({ id, name, price }) => ({ id, name, price })),
      }))
      .filter((category) => category.products.length > 0),
  };
}
