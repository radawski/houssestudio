"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryGroup, ConceptTotal } from "@/lib/cashbox";
import type { CashboxMovement } from "@/lib/data/cashbox";
import { formatCurrency, formatTime } from "@/lib/format";

const METHOD_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia" } as const;
const ORIGIN_LABEL = { turno: "Turno", venta_suelta: "Venta suelta", producto: "Producto" } as const;

/** "Efectivo", "Transferencia" o, si hubo de los dos, "Ef. $X · Tr. $Y". */
function methodSplit(byMethod: ConceptTotal["byMethod"]) {
  if (byMethod.transferencia === 0) return METHOD_LABEL.efectivo;
  if (byMethod.efectivo === 0) return METHOD_LABEL.transferencia;
  return `Ef. ${formatCurrency(byMethod.efectivo)} · Tr. ${formatCurrency(byMethod.transferencia)}`;
}

/** Fila de un movimiento (día): concepto, hora · origen, nota, monto y medio. */
function MovementRow({ movement }: { movement: CashboxMovement }) {
  return (
    <li className="flex items-start justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {movement.concept}
          {movement.quantity > 1 ? (
            <span className="text-muted-foreground font-normal"> × {movement.quantity}</span>
          ) : null}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
          {formatTime(movement.at)} · {ORIGIN_LABEL[movement.origin]}
        </p>
        {movement.note ? (
          <p className="text-muted-foreground mt-1 text-xs break-words">“{movement.note}”</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[15px] font-semibold tabular-nums">{formatCurrency(movement.amount)}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{METHOD_LABEL[movement.method]}</p>
      </div>
    </li>
  );
}

/** Fila de un concepto sumado (semana y mes): cantidad × precio y el medio de pago. */
function ConceptRow({ concept }: { concept: ConceptTotal }) {
  const unit = concept.quantity === 1 ? "unidad" : "unidades";
  return (
    <li className="flex items-start justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{concept.name}</p>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
          {/* Sin precio único (cambió en el período), solo la cantidad. */}
          {concept.unitPrice !== null
            ? `${concept.quantity} × ${formatCurrency(concept.unitPrice)}`
            : `${concept.quantity} ${unit}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[15px] font-semibold tabular-nums">{formatCurrency(concept.total)}</p>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{methodSplit(concept.byMethod)}</p>
      </div>
    </li>
  );
}

/** Nombre, "· N" y subtotal de las tres tarjetas de carga (anchos del diseño). */
const SKELETON_WIDTHS = [
  [134, 18, 76],
  [92, 14, 60],
  [112, 16, 68],
] as const;

/**
 * Caja por categoría en el celular (design iPhoneCajaDia / Semana / Mes): una
 * tarjeta por categoría con cantidad y subtotal en el encabezado, que se
 * pliega o despliega al tocarlo. En el día lista cada movimiento; en semana y
 * mes, cada concepto sumado. Reemplaza la lista de movimientos, las barras
 * por día y el calendario de calor (decisión del usuario).
 *
 * Con `groups = null` (cargando) son tres tarjetas cerradas con el chevron
 * real y barras en nombre, cantidad y subtotal (n-CajaVistaDia): igual en
 * día, semana y mes, porque al llegar los datos también arrancan cerradas.
 */
export function CategoryCards({
  groups,
  detail,
}: {
  groups: CategoryGroup<CashboxMovement>[] | null;
  /** `movimientos` en el día, `conceptos` en semana y mes. */
  detail: "movimientos" | "conceptos";
}) {
  // Todas cerradas de entrada (pedido del usuario; el diseño las mostraba
  // abiertas): al entrar a Caja se ve el resumen por categoría de un vistazo.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!groups) {
    return (
      <div className="flex flex-col gap-3 md:hidden">
        {SKELETON_WIDTHS.map(([name, quantity, total]) => (
          <div
            key={name}
            className="bg-card flex h-12 items-center gap-2 rounded-md border border-[var(--hs-border-card)] px-3.5"
          >
            <ChevronRight className="size-4 shrink-0 text-[var(--hs-mist)]" />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Skeleton className="h-[15px]" style={{ width: name }} />
              <Skeleton className="h-[13px]" style={{ width: quantity }} />
            </div>
            <Skeleton className="h-[15px]" style={{ width: total }} />
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="bg-card text-muted-foreground rounded-md border border-[var(--hs-border-card)] py-10 text-center text-sm md:hidden">
        Sin movimientos en este período.
      </div>
    );
  }

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {groups.map((group) => {
        const open = expanded.has(group.key);
        return (
          <section
            key={group.key}
            className="bg-card overflow-hidden rounded-md border border-[var(--hs-border-card)]"
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggle(group.key)}
              className="flex h-12 w-full items-center gap-2 px-3.5 text-left"
            >
              {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                {group.name}{" "}
                <span className="text-muted-foreground font-normal tabular-nums">· {group.quantity}</span>
              </span>
              <span className="text-[15px] font-semibold tabular-nums">{formatCurrency(group.total)}</span>
            </button>
            {open ? (
              <ul className="divide-y divide-[var(--hs-divider)] border-t border-[var(--hs-divider)]">
                {detail === "movimientos"
                  ? group.charges.map((movement) => (
                      <MovementRow key={`${movement.origin}-${movement.id}`} movement={movement} />
                    ))
                  : group.concepts.map((concept) => <ConceptRow key={concept.name} concept={concept} />)}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
