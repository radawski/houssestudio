import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package, Pencil, Plus } from "lucide-react";

import {
  CategoryDialog,
  CategoryOptions,
  DeleteCategoryButton,
  InlineProductForm,
  ProductRowActions,
  ProductSheet,
} from "@/app/admin/productos/product-dialogs";
import { BackHeader } from "@/components/admin/back-header";
import { Button } from "@/components/ui/button";
import { getProductCatalog, type CategoryWithProducts } from "@/lib/data/products";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Productos" };

const CARD = "bg-card rounded-md border border-[var(--hs-border-card)]";

function productCount(category: CategoryWithProducts) {
  const n = category.products.length;
  return `${n} ${n === 1 ? "producto" : "productos"}`;
}

/**
 * Celular, paso 1 (design iPhoneProductosB): la lista de categorías; cada una
 * lleva a su detalle.
 */
function MobileCategories({ catalog }: { catalog: CategoryWithProducts[] }) {
  return (
    <div className="flex flex-col gap-3.5 md:hidden">
      <BackHeader title="Productos" />
      <p className="text-muted-foreground text-[13px]">
        Elegí una categoría para ver y agregar productos.
      </p>
      {catalog.length > 0 ? (
        <div className={`${CARD} divide-y divide-[var(--hs-divider)]`}>
          {catalog.map((category) => (
            <Link
              key={category.id}
              href={`/admin/productos?categoria=${category.id}`}
              className="hover:bg-accent flex h-15 items-center gap-3 px-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{category.name}</span>
                <span className="text-muted-foreground block text-xs">{productCount(category)}</span>
              </span>
              <ChevronRight className="text-muted-foreground size-4.5 shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyCatalog />
      )}
      <CategoryDialog>
        <Button variant="outline" size="touch" className="w-full">
          <Plus className="size-4" />
          Nueva categoría
        </Button>
      </CategoryDialog>
    </div>
  );
}

/**
 * Celular, paso 2 (design iPhoneProductosB2): los productos de una categoría.
 * Tocar uno abre su hoja para editarlo; "Agregar producto" abre la de alta
 * (paso 3, iPhoneProductosB3).
 */
function MobileCategoryDetail({ category }: { category: CategoryWithProducts }) {
  return (
    <div className="flex flex-col gap-3.5 md:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <BackHeader title={category.name} href="/admin/productos" backLabel="Volver a Productos" />
          <p className="text-muted-foreground pl-11 text-[13px] md:pl-0">{productCount(category)}</p>
        </div>
        <CategoryOptions category={category} hasProducts={category.products.length > 0} />
      </div>
      {category.products.length > 0 ? (
        <div className={`${CARD} divide-y divide-[var(--hs-divider)]`}>
          {category.products.map((product) => (
            <ProductSheet key={product.id} category={category} product={product}>
              <button
                type="button"
                aria-label={`Editar ${product.name}`}
                className="hover:bg-accent flex h-13 w-full items-center gap-3 px-4 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-[15px]">{product.name}</span>
                <span className="text-[15px] tabular-nums">{formatCurrency(product.price)}</span>
                <Pencil className="text-muted-foreground size-4 shrink-0" />
              </button>
            </ProductSheet>
          ))}
        </div>
      ) : (
        <p className={`${CARD} text-muted-foreground px-4 py-8 text-center text-sm`}>
          Todavía no hay productos en esta categoría.
        </p>
      )}
      <ProductSheet category={category}>
        <Button size="touch" className="w-full">
          <Plus className="size-4" />
          Agregar producto
        </Button>
      </ProductSheet>
    </div>
  );
}

function EmptyCatalog() {
  return (
    <div className={`${CARD} flex flex-col items-center gap-2 px-6 py-10 text-center text-sm`}>
      <Package className="text-muted-foreground size-6" strokeWidth={1.75} />
      <p className="font-medium">Todavía no hay productos cargados.</p>
      <p className="text-muted-foreground">
        Creá una categoría (por ejemplo, Ceras o Bebidas) y cargale sus productos.
      </p>
    </div>
  );
}

/**
 * Escritorio (design ProductosB): categorías a la izquierda y, a la derecha,
 * los productos de la elegida con el alta en línea arriba.
 */
function DesktopCatalog({
  catalog,
  selected,
}: {
  catalog: CategoryWithProducts[];
  selected: CategoryWithProducts | undefined;
}) {
  return (
    <div className="hidden space-y-4 md:block">
      <div>
        <h1 className="text-xl font-semibold">Productos</h1>
        <p className="text-muted-foreground text-sm">Lo que se vende en caja además de los servicios.</p>
      </div>

      <div className="grid grid-cols-[17rem_minmax(0,1fr)] items-start gap-4">
        <section className={`${CARD} p-2`} aria-label="Categorías">
          <p className="text-muted-foreground px-2 pt-1 pb-2 text-[11px] font-medium tracking-[0.12em] uppercase">
            Categorías
          </p>
          <nav className="flex flex-col gap-0.5">
            {catalog.map((category) => (
              <Link
                key={category.id}
                href={`/admin/productos?categoria=${category.id}`}
                aria-current={category.id === selected?.id ? "true" : undefined}
                className={cn(
                  "flex h-10 items-center justify-between gap-2 rounded-md px-2.5 text-sm",
                  category.id === selected?.id ? "bg-accent font-medium" : "hover:bg-accent",
                )}
              >
                <span className="truncate">{category.name}</span>
                <span className="text-muted-foreground tabular-nums">{category.products.length}</span>
              </Link>
            ))}
          </nav>
          <CategoryDialog>
            <Button variant="outline" size="sm" className="mt-2 w-full">
              <Plus className="size-4" />
              Nueva categoría
            </Button>
          </CategoryDialog>
        </section>

        {selected ? (
          <section className={`${CARD} space-y-4 p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <p className="text-muted-foreground text-sm">{productCount(selected)}</p>
              </div>
              <div className="flex gap-1">
                <CategoryDialog category={selected}>
                  <Button variant="ghost" size="sm">
                    <Pencil className="size-4" />
                    Renombrar
                  </Button>
                </CategoryDialog>
                {selected.products.length === 0 ? <DeleteCategoryButton category={selected} /> : null}
              </div>
            </div>

            <InlineProductForm key={selected.id} category={selected} />

            {selected.products.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-[11px] tracking-[0.08em] uppercase">
                    <th className="py-2 font-medium">Producto</th>
                    <th className="py-2 text-right font-medium">Precio</th>
                    <th className="w-24 py-2 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.products.map((product) => (
                    <tr key={product.id} className="border-b border-[var(--hs-divider)] last:border-b-0">
                      <td className="py-2.5">{product.name}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatCurrency(product.price)}</td>
                      <td className="py-1">
                        <ProductRowActions category={selected} product={product} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Todavía no hay productos en esta categoría.
              </p>
            )}
          </section>
        ) : (
          <EmptyCatalog />
        )}
      </div>
    </div>
  );
}

export default async function ProductsPage({ searchParams }: PageProps<"/admin/productos">) {
  const { categoria } = await searchParams;
  const catalog = await getProductCatalog();
  const chosen = catalog.find((category) => category.id === categoria);

  return (
    <>
      {chosen ? <MobileCategoryDetail category={chosen} /> : <MobileCategories catalog={catalog} />}
      {/* En escritorio siempre hay una categoría elegida: la del link o la primera. */}
      <DesktopCatalog catalog={catalog} selected={chosen ?? catalog[0]} />
    </>
  );
}
