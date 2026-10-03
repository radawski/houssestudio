"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Clock, Package, Scissors } from "lucide-react";

import {
  isFreshReturn,
  MAS_RETURN_HIGHLIGHT_MS,
  MAS_RETURN_KEY,
  readSession,
  writeSession,
} from "@/lib/mas-return";

const LINKS = [
  {
    href: "/admin/servicios",
    label: "Servicios",
    description: "Catálogo, precios y duración.",
    icon: Scissors,
  },
  {
    href: "/admin/productos",
    label: "Productos",
    description: "Categorías, productos y precios.",
    icon: Package,
    isNew: true,
  },
  {
    href: "/admin/disponibilidad",
    label: "Disponibilidad",
    description: "Horario semanal y bloqueos.",
    icon: Clock,
  },
] as const;

/**
 * Filas de Más que llevan a otra pantalla. Al volver de una (su ←), esa fila
 * queda marcada 600 ms en `#f0f1f3` y se apaga: le dice al pulgar dónde
 * estaba (n-MasVolver*). Con "Reducir movimiento" se quita sin fundido.
 */
export function MasRows() {
  // Sincroniza con `sessionStorage`, que es externo a React: la marca se pone
  // y se saca directamente en el DOM, sin estado. El aviso se borra recién al
  // apagarse la marca (en desarrollo React corre el efecto dos veces) y solo
  // vale si es de recién (`isFreshReturn`).
  useEffect(() => {
    let notice: { row: string; at: number } | null = null;
    try {
      notice = JSON.parse(readSession(MAS_RETURN_KEY) ?? "null");
    } catch {
      notice = null;
    }
    if (!notice || !isFreshReturn(notice.at, Date.now())) return;

    const row = document.querySelector<HTMLElement>(`[data-mas-row="${notice.row}"]`);
    if (!row) return;
    row.dataset.returning = "";
    const timer = setTimeout(() => {
      delete row.dataset.returning;
      writeSession(MAS_RETURN_KEY, null);
    }, MAS_RETURN_HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
      delete row.dataset.returning;
    };
  }, []);

  // Fragmento y no un envoltorio: las filas tienen que ser hijas directas de
  // la tarjeta para que `divide-y` dibuje las líneas entre ellas.
  return (
    <>
      {LINKS.map(({ href, label, description, icon: Icon, ...link }) => (
        <Link
          key={href}
          href={href}
          data-mas-row={href}
          className="hover:bg-accent flex h-15 items-center gap-3 px-4 transition-colors motion-reduce:transition-none data-[returning]:bg-[var(--hs-track)]"
        >
          <Icon className="text-muted-foreground size-5 shrink-0" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium">
              {label}
              {"isNew" in link && link.isNew ? (
                <span className="rounded-full border border-[var(--hs-border-card)] px-1.5 text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Nuevo
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
          <ChevronRight className="text-muted-foreground size-4.5 shrink-0" />
        </Link>
      ))}
    </>
  );
}
