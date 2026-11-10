"use client";

import { useState, useTransition } from "react";
import { Repeat } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { endRecurring, pauseRecurring, resumeRecurring } from "@/lib/actions/recurring";
import { formatInTz } from "@/lib/format";
import { describeFrequency, describeSlot, type RecurrenceRule } from "@/lib/recurring";
import { toastActionError } from "@/lib/toast-error";

export type RecurringCardData = {
  id: string;
  rule: RecurrenceRule;
  startTime: string;
  active: boolean;
  serviceName: string | null;
  nextAt: string | null;
  lastAt: string | null;
};

/**
 * "Turno fijo" en la ficha del cliente (plan de noviembre, T2; prototipo
 * FichaCliente). Pausar deja de sumar fechas nuevas; Terminar además cancela
 * las que ya estaban agendadas. Terminar pide una segunda confirmación.
 */
export function CustomerRecurring({ items }: { items: RecurringCardData[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">Turno fijo</h3>
      {items.map((item) => (
        <RecurringCard key={item.id} item={item} />
      ))}
    </section>
  );
}

function RecurringCard({ item }: { item: RecurringCardData }) {
  const [pending, startTransition] = useTransition();
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const detail = [
    item.serviceName ?? "Sin servicio",
    !item.active
      ? "pausado"
      : item.nextAt
        ? `próximo ${formatInTz(item.nextAt, "d/M")}${
            item.lastAt && item.lastAt !== item.nextAt ? ` · agendado hasta ${formatInTz(item.lastAt, "d/M")}` : ""
          }`
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function run(action: () => Promise<string>, fallback: string) {
    startTransition(async () => {
      try {
        toast.success(await action());
        setConfirmingEnd(false);
      } catch (error) {
        toastActionError(error, fallback);
      }
    });
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-md border border-[var(--hs-border-card)] p-3.5">
      <div className="flex items-start gap-2.5">
        <Repeat className="mt-px size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0">
          <p className="text-[15px] font-medium">
            {describeSlot(item.rule, item.startTime)} · {describeFrequency(item.rule).toLowerCase()}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[13px] tabular-nums">{detail}</p>
        </div>
      </div>

      {confirmingEnd ? (
        <div className="space-y-2">
          <p className="text-sm">
            Se cancelan las fechas que ya estaban agendadas (con el motivo “Fin de turno fijo”) y no se suman más.
            Al cliente no le llega un mail.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="touch" className="flex-1" disabled={pending} onClick={() => setConfirmingEnd(false)}>
              No, dejarlo
            </Button>
            <Button
              variant="destructive"
              size="touch"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const { cancelados } = await endRecurring(item.id);
                  return cancelados > 0
                    ? `Turno fijo terminado · ${cancelados} ${cancelados === 1 ? "fecha cancelada" : "fechas canceladas"}.`
                    : "Turno fijo terminado.";
                }, "No se pudo terminar el turno fijo.")
              }
            >
              {pending ? "Terminando…" : "Sí, terminar"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {item.active ? (
            <Button
              variant="outline"
              size="touch"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await pauseRecurring(item.id);
                  return "Turno fijo pausado. Las fechas ya agendadas siguen en pie.";
                }, "No se pudo pausar el turno fijo.")
              }
            >
              Pausar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="touch"
              className="flex-1"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const { agendados, salteados } = await resumeRecurring(item.id);
                  const parts = [
                    agendados > 0
                      ? `Turno fijo reanudado · ${agendados} ${agendados === 1 ? "fecha agendada" : "fechas agendadas"}`
                      : "Turno fijo reanudado",
                  ];
                  if (salteados > 0) parts.push(`${salteados} salteada${salteados === 1 ? "" : "s"} (aviso en Hoy)`);
                  return `${parts.join(", ")}.`;
                }, "No se pudo reanudar el turno fijo.")
              }
            >
              Reanudar
            </Button>
          )}
          <Button
            variant="outline"
            size="touch"
            className="text-destructive flex-1"
            disabled={pending}
            onClick={() => setConfirmingEnd(true)}
          >
            Terminar
          </Button>
        </div>
      )}
    </div>
  );
}
