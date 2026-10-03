"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { SERVICES_CATEGORY, type CashboxBreakdown, type CategoryGroup } from "@/lib/cashbox";
import type { CashboxMovement } from "@/lib/data/cashbox";
import { formatCurrency, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const METHOD_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia" } as const;
const ORIGIN_LABEL = { turno: "Turno", venta_suelta: "Venta suelta", producto: "Producto" } as const;

const CARD = "bg-card rounded-md border border-[var(--hs-border-card)]";
const TH = "px-4 py-3 text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground border-b border-[var(--hs-border-card)]";
const TD = "px-4 py-3 border-b border-[var(--hs-divider)]";

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Barra + "%" de la columna "Del total" y de las tarjetas de medio de pago. */
function ShareBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 rounded-full bg-[var(--hs-track)]">
        <div className="bg-foreground h-1.5 rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 text-right text-[13px] tabular-nums">{value} %</span>
    </div>
  );
}

/**
 * Tarjetas de arriba en escritorio (design CajaCatA): el total en tinta con
 * cuántas unidades se vendieron, y efectivo y transferencia con su parte.
 * Con `breakdown = null` (cargando) quedan las etiquetas y los montos pasan a
 * barras: nunca `$ 0`.
 */
export function DesktopSummary({
  label,
  breakdown,
  groups,
}: {
  label: string;
  breakdown: CashboxBreakdown | null;
  groups: CategoryGroup<CashboxMovement>[] | null;
}) {
  if (!breakdown || !groups) {
    return (
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 md:grid">
        <div className="bg-foreground text-background rounded-md px-6 py-5">
          <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--hs-mist)] uppercase">{label}</p>
          <div className="mt-2 flex h-10 items-center">
            <Skeleton className="h-8 w-48 bg-white/15" />
          </div>
          <div className="mt-1 flex h-5 items-center">
            <Skeleton className="h-3 w-56 bg-white/15" />
          </div>
        </div>
        {(["efectivo", "transferencia"] as const).map((method) => (
          <div key={method} className={`${CARD} px-6 py-5`}>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
              {METHOD_LABEL[method]}
            </p>
            <div className="mt-2 flex h-8 items-center">
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--hs-track)]" />
          </div>
        ))}
      </div>
    );
  }

  const services = groups.find((group) => group.key === SERVICES_CATEGORY.key)?.quantity ?? 0;
  const units = groups.reduce((sum, group) => sum + group.quantity, 0);
  const products = units - services;

  return (
    <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 tabular-nums md:grid">
      <div className="bg-foreground text-background rounded-md px-6 py-5">
        <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--hs-mist)] uppercase">{label}</p>
        <p className="mt-2 text-4xl font-semibold">{formatCurrency(breakdown.total)}</p>
        <p className="mt-1 text-[13px] text-[var(--hs-mist)]">
          {units} {units === 1 ? "venta" : "ventas"} · {services} {services === 1 ? "servicio" : "servicios"} y{" "}
          {products} {products === 1 ? "producto" : "productos"}
        </p>
      </div>
      {(["efectivo", "transferencia"] as const).map((method) => {
        const share = percent(breakdown.byMethod[method], breakdown.total);
        return (
          <div key={method} className={`${CARD} px-6 py-5`}>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
              {METHOD_LABEL[method]} · {share} %
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(breakdown.byMethod[method])}</p>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--hs-track)]">
              <div className="bg-foreground h-1.5 rounded-full" style={{ width: `${share}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Tabla agrupada por categoría en escritorio (design CajaCatADia /
 * CajaCatASemana / CajaCatA). Cada categoría es una fila que se despliega:
 * en el día, con cada movimiento (hora, origen, medio, monto); en semana y
 * mes, con cada concepto sumado (cantidad, precio, efectivo, transferencia,
 * subtotal). Arrancan cerradas, como en el celular (pedido del usuario).
 */
export function CategoryTable({
  groups,
  breakdown,
  detail,
}: {
  groups: CategoryGroup<CashboxMovement>[] | null;
  breakdown: CashboxBreakdown | null;
  detail: "movimientos" | "conceptos";
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Cargando: tres filas de categoría cerradas, como llegan los datos.
  if (!groups || !breakdown) {
    return (
      <section className={`${CARD} hidden overflow-hidden md:block`}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="flex h-12 items-center gap-2 border-b border-[var(--hs-divider)] bg-[var(--hs-surface-raised)] px-5 last:border-b-0"
          >
            <ChevronRight className="size-4 shrink-0 text-[var(--hs-mist)]" />
            <Skeleton className="h-[15px] w-32" />
            <div className="flex-1" />
            <Skeleton className="h-[15px] w-20" />
            <Skeleton className="ml-8 h-1.5 w-40 rounded-full" />
          </div>
        ))}
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <div className={`${CARD} text-muted-foreground hidden py-10 text-center text-sm md:block`}>
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

  const units = groups.reduce((sum, group) => sum + group.quantity, 0);
  const byDay = detail === "movimientos";

  return (
    <section className={`${CARD} hidden overflow-hidden md:block`}>
      <table className="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr className="text-left">
            <th className={cn(TH, "pl-5")}>{byDay ? "Categoría / concepto" : "Categoría"}</th>
            {byDay ? (
              <>
                <th className={cn(TH, "w-20")}>Hora</th>
                <th className={cn(TH, "w-32")}>Origen</th>
                <th className={cn(TH, "w-36")}>Medio</th>
                <th className={cn(TH, "w-32 text-right")}>Monto</th>
              </>
            ) : (
              <>
                <th className={cn(TH, "text-right")}>Cant.</th>
                <th className={cn(TH, "text-right")}>Precio</th>
                <th className={cn(TH, "text-right")}>Efectivo</th>
                <th className={cn(TH, "text-right")}>Transferencia</th>
                <th className={cn(TH, "text-right")}>Subtotal</th>
              </>
            )}
            <th className={cn(TH, "w-40 pr-5")}>Del total</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const open = expanded.has(group.key);
            return (
              <Fragment key={group.key}>
                <tr className="bg-[var(--hs-surface-raised)]">
                  <td className={cn(TD, "py-0 pl-5")}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggle(group.key)}
                      className="flex h-12 items-center gap-2 text-[15px] font-semibold"
                    >
                      {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      {group.name}
                      {byDay ? (
                        <span className="text-muted-foreground text-[13px] font-normal">· {group.quantity}</span>
                      ) : null}
                    </button>
                  </td>
                  {byDay ? (
                    <>
                      <td className={TD} />
                      <td className={TD} />
                      <td className={TD} />
                      <td className={cn(TD, "text-right font-semibold")}>{formatCurrency(group.total)}</td>
                    </>
                  ) : (
                    <>
                      <td className={cn(TD, "text-right font-semibold")}>{group.quantity}</td>
                      <td className={TD} />
                      <td className={cn(TD, "text-right font-semibold")}>{formatCurrency(group.byMethod.efectivo)}</td>
                      <td className={cn(TD, "text-right font-semibold")}>
                        {formatCurrency(group.byMethod.transferencia)}
                      </td>
                      <td className={cn(TD, "text-right font-semibold")}>{formatCurrency(group.total)}</td>
                    </>
                  )}
                  <td className={cn(TD, "pr-5")}>
                    <ShareBar value={Math.round(group.share * 100)} />
                  </td>
                </tr>

                {open && byDay
                  ? group.charges.map((movement) => (
                      <tr key={`${movement.origin}-${movement.id}`}>
                        <td className={cn(TD, "pl-11")}>
                          {movement.concept}
                          {movement.quantity > 1 ? (
                            <span className="text-muted-foreground"> × {movement.quantity}</span>
                          ) : null}
                          {movement.note ? (
                            <span className="text-muted-foreground mt-0.5 block text-[13px]">“{movement.note}”</span>
                          ) : null}
                        </td>
                        <td className={cn(TD, "text-muted-foreground")}>{formatTime(movement.at)}</td>
                        <td className={cn(TD, "text-muted-foreground")}>{ORIGIN_LABEL[movement.origin]}</td>
                        <td className={cn(TD, "text-muted-foreground")}>{METHOD_LABEL[movement.method]}</td>
                        <td className={cn(TD, "text-right")}>{formatCurrency(movement.amount)}</td>
                        <td className={TD} />
                      </tr>
                    ))
                  : null}

                {open && !byDay
                  ? group.concepts.map((concept) => (
                      <tr key={concept.name}>
                        <td className={cn(TD, "pl-11")}>{concept.name}</td>
                        <td className={cn(TD, "text-right")}>{concept.quantity}</td>
                        <td className={cn(TD, "text-muted-foreground text-right")}>
                          {concept.unitPrice !== null ? formatCurrency(concept.unitPrice) : "—"}
                        </td>
                        <td className={cn(TD, "text-muted-foreground text-right")}>
                          {formatCurrency(concept.byMethod.efectivo)}
                        </td>
                        <td className={cn(TD, "text-muted-foreground text-right")}>
                          {formatCurrency(concept.byMethod.transferencia)}
                        </td>
                        <td className={cn(TD, "text-right")}>{formatCurrency(concept.total)}</td>
                        <td className={TD} />
                      </tr>
                    ))
                  : null}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="py-4 pl-5 text-[15px] font-semibold">Total</td>
            {byDay ? (
              <>
                <td />
                <td />
                <td className="text-muted-foreground px-4 py-4 text-[13px] whitespace-nowrap">
                  Ef. {formatCurrency(breakdown.byMethod.efectivo)} · Tr.{" "}
                  {formatCurrency(breakdown.byMethod.transferencia)}
                </td>
              </>
            ) : (
              <>
                <td className="px-4 py-4 text-right font-semibold">{units}</td>
                <td />
                <td className="px-4 py-4 text-right font-semibold">{formatCurrency(breakdown.byMethod.efectivo)}</td>
                <td className="px-4 py-4 text-right font-semibold">
                  {formatCurrency(breakdown.byMethod.transferencia)}
                </td>
              </>
            )}
            <td className="px-4 py-4 text-right text-base font-semibold">{formatCurrency(breakdown.total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
