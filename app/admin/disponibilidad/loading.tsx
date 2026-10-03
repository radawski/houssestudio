import { ChevronRight } from "lucide-react";

import { TimeBlockSheet } from "@/app/admin/disponibilidad/mobile-sheets";
import { BackHeader } from "@/components/admin/back-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { todayKey } from "@/lib/dates";

/** Lunes primero, como `WeeklyHoursMobile`. */
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const CARD = "bg-card rounded-md border border-[var(--hs-border-card)]";

/** Las tarjetas de escritorio de `page.tsx`, con sus textos fijos. */
const DESKTOP_CARDS = [
  {
    title: "Ventana de reserva",
    description:
      "Con cuánta anticipación se puede pedir un turno. Cambiarlo no afecta a los turnos ya tomados.",
    rows: 1,
  },
  {
    title: "Horario semanal",
    description:
      "Los bloques en los que se generan turnos cada día de la semana. Para cortar al mediodía, agregá un segundo bloque.",
    rows: 7,
  },
  {
    title: "Bloquear un rango",
    description:
      "Almuerzos, trámites, feriados o imprevistos. El rango deja de ofrecerse en el portal público.",
    rows: 1,
  },
  { title: "Bloqueos próximos", description: null, rows: 1 },
];

/**
 * Entrar a Disponibilidad desde Más (diseño "Estados de carga",
 * n-DisponibilidadCarga): el ←, "Ventana de reserva", los encabezados, los
 * siete días y "Bloquear un rango" (abre su hoja sin datos) son reales; las
 * franjas de cada día, el resumen de la ventana y los bloqueos van en barras.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="hs-reveal-bars">
      <span className="sr-only">Cargando disponibilidad…</span>

      <div className="flex flex-col gap-3.5 md:hidden">
        <BackHeader title="Disponibilidad" />
        <div className={`${CARD} flex items-center gap-3 px-3.5 py-3`}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Ventana de reserva</p>
            <div className="flex h-5 items-center">
              <Skeleton className="h-[13px] w-[236px] max-w-full" />
            </div>
          </div>
          <ChevronRight className="size-4.5 shrink-0 text-[var(--hs-mist)]" />
        </div>
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
            Horario semanal
          </h2>
          <div className={`${CARD} divide-y divide-[var(--hs-divider)]`}>
            {DAY_NAMES.map((name) => (
              <div key={name} className="flex h-[52px] items-center gap-2 pl-3.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="w-[76px] shrink-0 text-sm font-medium">{name}</span>
                  <Skeleton className="h-[13px] w-[156px]" />
                </div>
                <div className="flex h-11 w-12 shrink-0 items-center justify-center">
                  <Skeleton className="h-[26px] w-11 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
            Bloqueos
          </h2>
          <TimeBlockSheet todayKey={todayKey()} />
          <div className={`${CARD} px-3.5 py-3`}>
            <Skeleton className="h-[13px] w-[190px]" />
          </div>
        </section>
      </div>

      <div className="hidden space-y-4 md:block">
        <div>
          <h1 className="text-xl font-semibold">Disponibilidad</h1>
          <p className="text-muted-foreground text-sm">Horario semanal y excepciones puntuales.</p>
        </div>
        {DESKTOP_CARDS.map(({ title, description, rows }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
              {description ? <CardDescription>{description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: rows }, (_, index) => (
                <Skeleton key={index} className="h-9 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
