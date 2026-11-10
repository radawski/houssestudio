"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Minus, Plus, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { SplitAmounts, type PaymentChoice } from "@/components/admin/appointment-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordWalkInSale } from "@/lib/actions/sales";
import { SERVICES_CATEGORY } from "@/lib/cashbox";
import type { SaleCatalog } from "@/lib/data/products";
import { formatCurrency } from "@/lib/format";
import type { WalkInSaleKind } from "@/lib/supabase/database.types";
import { toastActionError, toastError } from "@/lib/toast-error";
import { cn } from "@/lib/utils";

type CatalogItem = SaleCatalog["services"][number];

type Group = { key: string; name: string; kind: WalkInSaleKind; items: CatalogItem[] };

/** Clave de un ítem en el carrito: el mismo id no se repite entre servicios y productos. */
const itemKey = (kind: WalkInSaleKind, id: string) => `${kind}:${id}`;

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** − n + de un ítem ya agregado (design VentaC: "Quitar uno de…" / "Sumar uno de…"). */
function Stepper({ name, quantity, onChange }: { name: string; quantity: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center rounded-md border border-[var(--hs-mist)]">
      <button
        type="button"
        aria-label={`Quitar uno de ${name}`}
        onClick={() => onChange(quantity - 1)}
        className="flex size-10 items-center justify-center"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        aria-label={`Sumar uno de ${name}`}
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= 99}
        className="flex size-10 items-center justify-center disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/**
 * Una venta ya registrada que se vuelve a cargar para corregirla ("Anular y
 * volver a cargar", 0018). `missing` cuenta los ítems que ya no están en el
 * catálogo y no se pueden volver a poner.
 */
export type SaleDraft = {
  saleId: string;
  items: { kind: WalkInSaleKind; id: string; quantity: number }[];
  method: PaymentChoice;
  cash: string;
  note: string;
  missing: number;
};

/**
 * Venta suelta con carrito (design VentaC / iPhoneVentaC): lo que entró sin
 * turno, uno o más ítems del catálogo. Los servicios son la categoría
 * "Cortes" y los productos van por su categoría; cada una se despliega con su
 * lista, "Agregar" o el contador por ítem, y el pie suma unidades y total.
 *
 * Solo catálogo (decisión del usuario): no hay monto editable ni producto de
 * nombre libre. El precio que se muestra es el de lista; el que se guarda lo
 * toma el servidor del mismo catálogo.
 */
export function WalkInSaleButton({
  catalog,
  open: controlledOpen,
  onOpenChange,
  withTriggers = true,
  initial,
}: {
  catalog: SaleCatalog;
  /** Corregir una venta ya registrada: arranca con sus datos y, al guardar, la reemplaza. */
  initial?: SaleDraft;
  /** Abierto desde afuera (el menú "+ Nuevo" de la Agenda). Sin esto, maneja su propio estado. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Sus propios botones (escritorio y FAB). La Agenda los reemplaza por "+ Nuevo". */
  withTriggers?: boolean;
}) {
  const groups: Group[] = useMemo(
    () => [
      { key: SERVICES_CATEGORY.key, name: SERVICES_CATEGORY.name, kind: "servicio", items: catalog.services },
      ...catalog.categories
        .filter((category) => category.products.length > 0)
        .map((category) => ({ key: category.id, name: category.name, kind: "producto" as const, items: category.products })),
    ],
    [catalog],
  );

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }
  const initialCart = () => new Map(initial?.items.map((item) => [itemKey(item.kind, item.id), item.quantity]));
  // Cortes abierta de entrada: un corte sin turno es la venta más común. Al
  // corregir, además, las categorías de lo que ya estaba en la venta.
  const initialExpanded = () =>
    new Set([
      SERVICES_CATEGORY.key,
      ...groups
        .filter((group) => group.items.some((item) => initial?.items.some((i) => i.kind === group.kind && i.id === item.id)))
        .map((group) => group.key),
    ]);
  const [cart, setCart] = useState<Map<string, number>>(initialCart);
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<PaymentChoice>(initial?.method ?? "efectivo");
  const [cash, setCash] = useState(initial?.cash ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, startTransition] = useTransition();

  function reset() {
    setCart(initialCart());
    setExpanded(initialExpanded());
    setQuery("");
    setMethod(initial?.method ?? "efectivo");
    setCash(initial?.cash ?? "");
    setNote(initial?.note ?? "");
  }

  function setQuantity(kind: WalkInSaleKind, id: string, quantity: number) {
    setCart((current) => {
      const next = new Map(current);
      if (quantity <= 0) next.delete(itemKey(kind, id));
      else next.set(itemKey(kind, id), Math.min(quantity, 99));
      return next;
    });
  }

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Con búsqueda, se ven solo los ítems que coinciden y sus categorías, abiertas.
  const search = normalize(query.trim());
  const visibleGroups = search
    ? groups
        .map((group) => ({ ...group, items: group.items.filter((item) => normalize(item.name).includes(search)) }))
        .filter((group) => group.items.length > 0)
    : groups;

  const lines = groups.flatMap((group) =>
    group.items
      .filter((item) => cart.has(itemKey(group.kind, item.id)))
      .map((item) => ({ group, item, quantity: cart.get(itemKey(group.kind, item.id))! })),
  );
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.item.price, 0);
  const summary = lines.map((line) => (line.quantity > 1 ? `${line.item.name} × ${line.quantity}` : line.item.name)).join(", ");

  const split = method === "dividido";
  const cashOver = split && (Number(cash) || 0) > total;

  function submit() {
    const input = {
      items: lines.map((line) => ({ kind: line.group.kind, id: line.item.id, quantity: line.quantity })),
      // Dividido: el efectivo viaja aparte y el resto va por transferencia
      // (`record_walk_in_sale_split`); `method` ahí no se usa para sumar.
      method: split ? ("efectivo" as const) : method,
      cash: split ? Math.min(Math.max(Number(cash) || 0, 0), total) : undefined,
      note: note.trim() || undefined,
      replacesSaleId: initial?.saleId,
    };
    startTransition(async () => {
      try {
        const result = await recordWalkInSale(input);
        if (result.status === "success") {
          toast.success(result.message);
          setOpen(false);
          reset();
        } else {
          // Un ítem que salió del catálogo o un dato inválido: se corrige en la venta.
          toastError(result.message ?? "No se pudo registrar la venta.");
        }
      } catch (error) {
        toastActionError(error, "No se pudo registrar la venta.", submit);
      }
    });
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      {withTriggers ? (
        <>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="hidden md:inline-flex">
              <ShoppingBag className="size-4" />
              Venta suelta
            </Button>
          </DialogTrigger>

          {/* FAB (design/admin-iphone n-Agenda): mismo diálogo, disparador
              propio para mobile, fijo por encima de la tab bar inferior. 84 =
              alto de la tab bar (6 + 56 + 6) + 16 de aire. */}
          <DialogTrigger asChild>
            <Button
              size="touch-lg"
              className="fixed right-4 bottom-[84px] z-30 gap-2 rounded-full px-4.5 shadow-lg md:hidden"
            >
              <Plus className="size-[18px]" />
              Venta suelta
            </Button>
          </DialogTrigger>
        </>
      ) : null}

      {/* En el celular, hoja casi de pantalla completa (design iPhoneVentaC):
          la lista se desplaza y el pie con el total queda fijo abajo. Con
          alto fijo, la grilla de `DialogContent` repartía el sobrante entre
          sus filas (un hueco bajo la manija): acá va en columna y el cuerpo
          (su segundo hijo) ocupa el resto, así el pie queda abajo aunque haya
          pocos ítems. En escritorio vuelve a ser el diálogo centrado de
          `DialogContent`, con su alto máximo y desplazamiento propio. */}
      <DialogContent className="flex h-[calc(100dvh-40px)] max-h-none flex-col pb-0 sm:grid sm:h-auto sm:max-w-lg sm:pb-0 [&>div:nth-child(2)]:flex-1">
        <DialogHeader>
          <DialogTitle>{initial ? "Corregir venta" : "Registrar venta suelta"}</DialogTitle>
          <DialogDescription>
            {initial
              ? `Al guardar, esta venta reemplaza a la anterior.${
                  initial.missing > 0
                    ? ` ${initial.missing === 1 ? "Un ítem ya no está" : `${initial.missing} ítems ya no están`} en el catálogo y no se puede volver a cargar.`
                    : ""
                }`
              : "Un corte que entró sin turno reservado, o un producto."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Label htmlFor="walkin-search" className="sr-only">
            Buscar
          </Label>
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="walkin-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar"
            autoComplete="off"
            className="h-11 pl-9 text-base md:h-9 md:text-sm"
          />
        </div>

        <div className="space-y-2">
          {visibleGroups.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {search ? "No hay nada con ese nombre." : "Todavía no hay servicios ni productos cargados."}
            </p>
          ) : null}
          {visibleGroups.map((group) => {
            const isOpen = Boolean(search) || expanded.has(group.key);
            const chosen = group.items.filter((item) => cart.has(itemKey(group.kind, item.id))).length;
            return (
              <section key={group.key} className="overflow-hidden rounded-md border border-[var(--hs-border-card)]">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(group.key)}
                  className="flex h-12 w-full items-center gap-2 bg-[var(--hs-surface-raised)] px-3 text-left"
                >
                  {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="flex-1 text-[15px] font-medium">
                    {group.name} <span className="text-muted-foreground font-normal">· {group.items.length}</span>
                  </span>
                  {chosen > 0 ? (
                    <span className="text-muted-foreground text-xs">
                      {chosen} {chosen === 1 ? "elegido" : "elegidos"}
                    </span>
                  ) : null}
                </button>
                {isOpen ? (
                  <ul className="divide-y divide-[var(--hs-divider)]">
                    {group.items.map((item) => {
                      const quantity = cart.get(itemKey(group.kind, item.id)) ?? 0;
                      return (
                        <li key={item.id} className="flex min-h-14 items-center gap-3 px-3 py-1.5">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{item.name}</span>
                            <span className="text-muted-foreground block text-xs tabular-nums">
                              {formatCurrency(item.price)}
                            </span>
                          </span>
                          {quantity > 0 ? (
                            <Stepper
                              name={item.name}
                              quantity={quantity}
                              onChange={(n) => setQuantity(group.kind, item.id, n)}
                            />
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10"
                              aria-label={`Agregar ${item.name}`}
                              onClick={() => setQuantity(group.kind, item.id, 1)}
                            >
                              Agregar
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label>Medio de pago</Label>
          <div role="group" aria-label="Medio de pago" className="bg-muted grid grid-cols-3 gap-0.5 rounded-md p-0.5">
            {(["efectivo", "transferencia", "dividido"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={method === option}
                onClick={() => setMethod(option)}
                className={cn(
                  "h-10 rounded text-sm capitalize",
                  method === option ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {split ? <SplitAmounts total={total} cash={cash} onCashChange={setCash} idPrefix="walkin-split" /> : null}

        <div className="space-y-1.5">
          <Label htmlFor="walkin-note">Nota (opcional)</Label>
          <Input
            id="walkin-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            autoComplete="off"
            className="h-11 text-base md:h-9 md:text-sm"
          />
        </div>

        {/* Pie fijo dentro de la hoja que se desplaza. */}
        <div className="bg-popover sticky bottom-0 -mx-4 mt-auto flex items-center gap-3 border-t px-4 pt-3 pb-6 sm:pb-4">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-xs">
              {units === 0 ? "Sin ítems" : `${units} ${units === 1 ? "unidad" : "unidades"}`}
              {summary ? <span className="hidden sm:inline"> · {summary}</span> : null}
            </p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(total)}</p>
          </div>
          <Button size="touch-lg" disabled={units === 0 || pending || cashOver} onClick={submit}>
            {initial ? (pending ? "Guardando…" : "Guardar venta") : pending ? "Registrando…" : "Registrar venta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
