"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Plus, ShoppingBag, X } from "lucide-react";

import { NewAppointmentSheet } from "@/components/admin/new-appointment-sheet";
import { WalkInSaleButton } from "@/components/admin/walk-in-sale-button";
import { Button } from "@/components/ui/button";
import type { SaleCatalog } from "@/lib/data/products";

/**
 * Lo que se agrega desde la Agenda (plan de noviembre, T1; prototipo
 * MenuNuevo). En el celular, el botón flotante "+ Nuevo" (mismo lugar y
 * forma que el "+ Venta suelta" de antes) abre un menú con "Nuevo turno" y
 * "Venta suelta". En escritorio, dos botones en la barra.
 */
export function AgendaNewActions({ catalog, dateKey }: { catalog: SaleCatalog; dateKey: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  // Cada apertura monta la hoja de cero (sin restos de la anterior).
  const [appointmentKey, setAppointmentKey] = useState(0);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function openAppointment() {
    setMenuOpen(false);
    setAppointmentKey((key) => key + 1);
    setAppointmentOpen(true);
  }

  function openSale() {
    setMenuOpen(false);
    setSaleOpen(true);
  }

  return (
    <>
      {/* Escritorio */}
      <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={openAppointment}>
        <CalendarPlus className="size-4" />
        Nuevo turno
      </Button>
      <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={openSale}>
        <ShoppingBag className="size-4" />
        Venta suelta
      </Button>

      {/* Celular: FAB por encima de la tab bar (84 = 6 + 56 + 6 + 16 de aire). */}
      <Button
        size="touch-lg"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
        // Con el menú abierto la X ocupa su lugar: el botón no se ve detrás.
        className={`fixed right-4 bottom-[84px] z-30 gap-2 rounded-full px-4.5 shadow-lg md:hidden ${menuOpen ? "invisible" : ""}`}
      >
        <Plus className="size-[18px]" />
        Nuevo
      </Button>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-[var(--hs-ink)]/45"
          />
          <div role="menu" className="absolute right-4 bottom-[84px] flex flex-col items-end gap-2.5">
            <button
              type="button"
              role="menuitem"
              onClick={openAppointment}
              className="bg-card flex h-13 items-center gap-3 rounded-full border border-[var(--hs-border-card)] pr-4.5 pl-3 text-[15px] font-medium"
            >
              <span className="bg-background flex size-8 items-center justify-center rounded-full">
                <CalendarPlus className="size-4.5" strokeWidth={1.75} />
              </span>
              Nuevo turno
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={openSale}
              className="bg-card flex h-13 items-center gap-3 rounded-full border border-[var(--hs-border-card)] pr-4.5 pl-3 text-[15px] font-medium"
            >
              <span className="bg-background flex size-8 items-center justify-center rounded-full">
                <ShoppingBag className="size-4.5" strokeWidth={1.75} />
              </span>
              Venta suelta
            </button>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setMenuOpen(false)}
              className="bg-card flex size-12 items-center justify-center rounded-full"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      ) : null}

      <WalkInSaleButton catalog={catalog} open={saleOpen} onOpenChange={setSaleOpen} withTriggers={false} />
      <NewAppointmentSheet
        key={appointmentKey}
        open={appointmentOpen}
        onOpenChange={setAppointmentOpen}
        initialDateKey={dateKey}
      />
    </>
  );
}
