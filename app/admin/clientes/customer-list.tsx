"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { initials, matchesCustomerQuery } from "@/lib/customer-summary";
import type { CustomerListItem } from "@/lib/data/customers";
import { formatInTz } from "@/lib/format";

/** Cuántas filas se pintan de entrada; el resto aparece al buscar o con "Ver más". */
const PAGE = 60;

/**
 * Lista de clientes con buscador (plan de noviembre, C1). Filtra en el
 * celular, sin ir a la base: por nombre (sin tildes, en cualquier orden) o
 * por DNI / teléfono.
 */
export function CustomerList({ customers }: { customers: CustomerListItem[] }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const filtered = customers.filter((customer) => matchesCustomerQuery(customer, query));
  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-3.5">
      <div className="relative">
        <label htmlFor="customer-search" className="sr-only">
          Buscar cliente
        </label>
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id="customer-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(PAGE);
          }}
          placeholder="Buscar por nombre, DNI o teléfono"
          autoComplete="off"
          className="h-12 pl-9 text-base md:h-10 md:text-sm"
        />
      </div>

      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
        {query.trim()
          ? `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`
          : `${customers.length} ${customers.length === 1 ? "cliente" : "clientes"} · últimos en venir`}
      </p>

      {visible.length === 0 ? (
        <p className="bg-card text-muted-foreground rounded-md border border-[var(--hs-border-card)] px-4 py-8 text-center text-sm">
          {query.trim() ? "No hay clientes que coincidan." : "Todavía no hay clientes cargados."}
        </p>
      ) : (
        <ul className="bg-card divide-y divide-[var(--hs-divider)] overflow-hidden rounded-md border border-[var(--hs-border-card)]">
          {visible.map((customer) => (
            <li key={customer.id}>
              <CustomerRow customer={customer} />
            </li>
          ))}
        </ul>
      )}

      {filtered.length > visible.length ? (
        <button
          type="button"
          onClick={() => setLimit((current) => current + PAGE)}
          className="text-muted-foreground hover:text-foreground min-h-11 w-full text-sm"
        >
          Ver más ({filtered.length - visible.length})
        </button>
      ) : null}
    </div>
  );
}

function CustomerRow({ customer }: { customer: CustomerListItem }) {
  const { summary } = customer;
  const meta = summary.lastVisitAt
    ? `Última visita ${formatInTz(summary.lastVisitAt, "d/M")} · ${summary.visits} ${summary.visits === 1 ? "visita" : "visitas"}`
    : summary.nextAt
      ? `Primer turno el ${formatInTz(summary.nextAt, "d/M")}`
      : "Sin visitas todavía";

  return (
    <Link
      href={`/admin/clientes/${customer.id}`}
      className="hover:bg-accent flex min-h-[68px] items-center gap-3 px-3.5 py-2.5"
    >
      <span
        aria-hidden
        className="bg-background text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
      >
        {initials(customer.full_name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{customer.full_name}</span>
        <span className="text-muted-foreground block truncate text-[13px] tabular-nums">{meta}</span>
      </span>
      {summary.noShows > 0 ? (
        <span className="inline-flex h-[22px] shrink-0 items-center rounded-full border border-[#f3c9c4] bg-[#fdeeec] px-2 text-[11px] font-medium text-[#9a2a22] tabular-nums">
          Faltó {summary.noShows}
        </span>
      ) : null}
      <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
    </Link>
  );
}
