"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Minus, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SaleCatalog } from "@/lib/data/products";
import { formatCurrency } from "@/lib/format";
import type { WalkInSaleKind } from "@/lib/supabase/database.types";

type CatalogItem = SaleCatalog["services"][number];

export type CatalogGroup = { key: string; name: string; kind: WalkInSaleKind; items: CatalogItem[] };

/** Clave de un ítem en el carrito: el mismo id no se repite entre servicios y productos. */
export const itemKey = (kind: WalkInSaleKind, id: string) => `${kind}:${id}`;

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
 * Buscador y lista del catálogo por categoría, con "Agregar" o el contador
 * por ítem. Lo usan la venta suelta y "Cobrar turno" (productos que se suman
 * al cobro, 0020). El carrito lo maneja quien lo usa; qué categorías están
 * abiertas y la búsqueda, el propio buscador.
 */
export function CatalogPicker({
  groups,
  cart,
  onQuantityChange,
  initialExpanded,
  searchId,
  emptyLabel = "Todavía no hay servicios ni productos cargados.",
}: {
  groups: CatalogGroup[];
  cart: Map<string, number>;
  onQuantityChange: (kind: WalkInSaleKind, id: string, quantity: number) => void;
  initialExpanded: () => Set<string>;
  searchId: string;
  emptyLabel?: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);
  const [query, setQuery] = useState("");

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

  return (
    <>
      <div className="relative">
        <Label htmlFor={searchId} className="sr-only">
          Buscar
        </Label>
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id={searchId}
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
            {search ? "No hay nada con ese nombre." : emptyLabel}
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
                            onChange={(n) => onQuantityChange(group.kind, item.id, n)}
                          />
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10"
                            aria-label={`Agregar ${item.name}`}
                            onClick={() => onQuantityChange(group.kind, item.id, 1)}
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
    </>
  );
}
