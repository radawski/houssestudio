"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategory,
  deleteCategory,
  deleteProduct,
  renameCategory,
  saveProduct,
} from "@/lib/actions/products";
import type { ActionState } from "@/lib/actions/result";
import type { Product, ProductCategory } from "@/lib/supabase/database.types";
import { toastActionError, toastError } from "@/lib/toast-error";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

/**
 * Corre una acción del catálogo con el aviso que corresponde: éxito en tinta;
 * un error de la acción (nombre repetido, categoría con productos) sin
 * "Reintentar", porque se corrige a mano; un error de red, con "Reintentar".
 */
function useCatalogAction() {
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<ActionState>,
    fallback: string,
    onSuccess?: (result: ActionState) => void,
    onFieldErrors?: (errors: Record<string, string>) => void,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.status === "success") {
          toast.success(result.message);
          onSuccess?.(result);
        } else if (result.fieldErrors && onFieldErrors) {
          onFieldErrors(result.fieldErrors);
        } else {
          toastError(result.message ?? fallback);
        }
      } catch (error) {
        toastActionError(error, fallback, () => run(action, fallback, onSuccess, onFieldErrors));
      }
    });
  }

  return { pending, run };
}

const MONEY_INPUT = "h-12 pl-[26px] text-base tabular-nums md:h-9 md:text-sm";
const TEXT_INPUT = "h-12 text-base md:h-9 md:text-sm";

function PriceInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base md:text-sm">
        $
      </span>
      <Input
        id={id}
        type="number"
        min={0}
        // De a 1 peso: con `step={100}` el navegador bloqueaba en silencio
        // precios como $2.350.
        step={1}
        inputMode="numeric"
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={MONEY_INPUT}
        required
      />
    </div>
  );
}

/**
 * Hoja "Nuevo producto" / "Editar producto" (design iPhoneProductosB3). En
 * edición suma "Eliminar producto": en el celular no hay fila con papelera.
 */
export function ProductSheet({
  category,
  product,
  children,
}: {
  category: ProductCategory;
  product?: Product;
  /** El disparador: el botón "Agregar producto" o la fila del producto. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [errors, setErrors] = useState<Record<string, string>>();
  const { pending, run } = useCatalogAction();

  function reset(next: boolean) {
    setOpen(next);
    if (next) {
      setName(product?.name ?? "");
      setPrice(product ? String(product.price) : "");
      setErrors(undefined);
    }
  }

  function save() {
    run(
      () => saveProduct({ id: product?.id, categoryId: category.id, name, price }),
      "No se pudo guardar el producto.",
      () => setOpen(false),
      setErrors,
    );
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>En {category.name}.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Nombre</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Agua con gas"
              maxLength={60}
              autoComplete="off"
              className={TEXT_INPUT}
              required
            />
            <FieldError message={errors?.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-price">Precio</Label>
            <PriceInput id="product-price" value={price} onChange={setPrice} />
            <FieldError message={errors?.price} />
          </div>

          <DialogFooter>
            {product ? (
              <DeleteProductButton product={product} onDeleted={() => setOpen(false)} />
            ) : (
              <Button type="button" variant="ghost" size="touch-lg" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            )}
            <Button type="submit" size="touch-xl" disabled={pending}>
              {pending ? "Guardando…" : "Guardar producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProductButton({ product, onDeleted }: { product: Product; onDeleted?: () => void }) {
  const { pending, run } = useCatalogAction();
  return (
    <Button
      type="button"
      variant="ghost"
      size="touch-lg"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Borrar "${product.name}"? Las ventas ya registradas no cambian.`)) return;
        run(() => deleteProduct(product.id), "No se pudo borrar el producto.", () => onDeleted?.());
      }}
    >
      <Trash2 className="size-4" />
      Eliminar producto
    </Button>
  );
}

/** Editar y borrar en la fila de la tabla de escritorio (design ProductosB). */
export function ProductRowActions({ category, product }: { category: ProductCategory; product: Product }) {
  const { pending, run } = useCatalogAction();
  return (
    <div className="flex items-center justify-end">
      <ProductSheet category={category} product={product}>
        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${product.name}`}>
          <Pencil className="size-4" />
        </Button>
      </ProductSheet>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Eliminar ${product.name}`}
        disabled={pending}
        onClick={() => {
          if (!confirm(`¿Borrar "${product.name}"? Las ventas ya registradas no cambian.`)) return;
          run(() => deleteProduct(product.id), "No se pudo borrar el producto.");
        }}
      >
        <Trash2 className="text-destructive size-4" />
      </Button>
    </div>
  );
}

/** Alta en línea de escritorio: Nombre, Precio y "Agregar producto" (design ProductosB). */
export function InlineProductForm({ category }: { category: ProductCategory }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>();
  const { pending, run } = useCatalogAction();

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => saveProduct({ categoryId: category.id, name, price }),
          "No se pudo agregar el producto.",
          () => {
            setName("");
            setPrice("");
            setErrors(undefined);
          },
          setErrors,
        );
      }}
    >
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor="inline-product-name">Nombre</Label>
        <Input
          id="inline-product-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Agua con gas"
          maxLength={60}
          autoComplete="off"
          required
        />
        <FieldError message={errors?.name} />
      </div>
      <div className="w-36 space-y-1.5">
        <Label htmlFor="inline-product-price">Precio</Label>
        <PriceInput id="inline-product-price" value={price} onChange={setPrice} />
        <FieldError message={errors?.price} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando…" : "Agregar producto"}
      </Button>
    </form>
  );
}

/**
 * Diálogo "Nueva categoría" o "Renombrar categoría". Con `children` trae su
 * propio disparador; sin él se abre desde afuera con `open`/`onOpenChange`
 * (el menú de opciones del celular).
 */
export function CategoryDialog({
  category,
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  category?: ProductCategory;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = onOpenChange ?? setOwnOpen;
  const [name, setName] = useState(category?.name ?? "");
  const [errors, setErrors] = useState<Record<string, string>>();
  const { pending, run } = useCatalogAction();

  function reset(next: boolean) {
    setOpen(next);
    if (next) {
      setName(category?.name ?? "");
      setErrors(undefined);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Renombrar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            {category
              ? "El nombre nuevo se ve también en la Caja y en la venta."
              : "Agrupa productos en la Caja y en la venta suelta."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => (category ? renameCategory(category.id, name) : createCategory(name)),
              "No se pudo guardar la categoría.",
              (result) => {
                setOpen(false);
                // Una categoría nueva queda elegida, lista para cargarle productos.
                const id = (result as ActionState & { id?: string }).id;
                if (id) router.push(`/admin/productos?categoria=${id}`);
              },
              setErrors,
            );
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Nombre</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Ceras"
              maxLength={40}
              autoComplete="off"
              className={TEXT_INPUT}
              required
            />
            <FieldError message={errors?.name} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="touch-lg" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="touch-xl" disabled={pending}>
              {pending ? "Guardando…" : category ? "Guardar" : "Crear categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Borrar una categoría vacía; con productos, la acción explica por qué no. */
export function useDeleteCategory(category: ProductCategory) {
  const router = useRouter();
  const { pending, run } = useCatalogAction();
  return {
    pending,
    remove() {
      if (!confirm(`¿Borrar la categoría "${category.name}"?`)) return;
      run(() => deleteCategory(category.id), "No se pudo borrar la categoría.", () =>
        router.push("/admin/productos"),
      );
    },
  };
}

/** Menú "Opciones de la categoría" del detalle en el celular (design iPhoneProductosB2). */
export function CategoryOptions({ category, hasProducts }: { category: ProductCategory; hasProducts: boolean }) {
  const { pending, remove } = useDeleteCategory(category);
  const [renaming, setRenaming] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-touch" aria-label="Opciones de la categoría">
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={hasProducts || pending} onSelect={remove}>
            <Trash2 />
            {hasProducts ? "Eliminar (vaciala antes)" : "Eliminar categoría"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* `key`: abierto desde el menú se monta de nuevo, así el campo arranca
          del nombre guardado, igual que con su propio disparador. */}
      <CategoryDialog
        key={`${category.name}-${renaming}`}
        category={category}
        open={renaming}
        onOpenChange={setRenaming}
      />
    </>
  );
}

/** "Eliminar categoría" de escritorio; solo aparece con la categoría vacía. */
export function DeleteCategoryButton({ category }: { category: ProductCategory }) {
  const { pending, remove } = useDeleteCategory(category);
  return (
    <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={remove}>
      <Trash2 className="size-4" />
      Eliminar categoría
    </Button>
  );
}
