"use client";

import { useState, useTransition } from "react";
import { Repeat } from "lucide-react";
import { toast } from "sonner";

import { NewAppointmentSheet } from "@/components/admin/new-appointment-sheet";
import { Button } from "@/components/ui/button";
import { dismissRecurringSkip } from "@/lib/actions/recurring";
import { businessTimeToDate } from "@/lib/availability";
import { formatInTz } from "@/lib/format";
import { toastActionError } from "@/lib/toast-error";

export type SkipNoticeItem = {
  id: string;
  skippedOn: string;
  reason: string;
  startTime: string;
  customer: { id: string; full_name: string } | null;
  serviceId: string | null;
};

/**
 * Aviso de Hoy (plan de noviembre, T2; prototipo HoyAviso): una fecha de un
 * turno fijo que no se pudo agendar. "Elegir otro horario" abre "Nuevo
 * turno" con el cliente y el servicio ya puestos, en ese día; al agendar, el
 * aviso se cierra. "Saltear esa fecha" lo cierra sin agendar nada.
 */
export function RecurringSkipNotice({ skips }: { skips: SkipNoticeItem[] }) {
  const [rescheduling, setRescheduling] = useState<SkipNoticeItem | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  return (
    <>
      {skips.map((skip) => (
        <SkipCard
          key={skip.id}
          skip={skip}
          onReschedule={() => {
            setSheetKey((key) => key + 1);
            setRescheduling(skip);
          }}
        />
      ))}
      {rescheduling?.customer ? (
        <NewAppointmentSheet
          key={sheetKey}
          open
          onOpenChange={(open) => !open && setRescheduling(null)}
          initialDateKey={rescheduling.skippedOn}
          preset={{
            customerId: rescheduling.customer.id,
            customerName: rescheduling.customer.full_name,
            serviceId: rescheduling.serviceId,
            skipId: rescheduling.id,
          }}
        />
      ) : null}
    </>
  );
}

function SkipCard({ skip, onReschedule }: { skip: SkipNoticeItem; onReschedule: () => void }) {
  const [pending, startTransition] = useTransition();
  const when = formatInTz(businessTimeToDate(skip.skippedOn, skip.startTime), "EEEE d/M, HH:mm");

  function dismiss() {
    startTransition(async () => {
      try {
        await dismissRecurringSkip(skip.id);
        toast.success("Listo, esa fecha queda sin turno.");
      } catch (error) {
        toastActionError(error, "No se pudo cerrar el aviso.", dismiss);
      }
    });
  }

  return (
    <section
      aria-label="Turno fijo sin agendar"
      className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-100 p-3.5 text-amber-900"
    >
      <div className="flex items-start gap-2.5">
        <Repeat className="mt-px size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        <div>
          <p className="text-sm font-semibold">Un turno fijo no se pudo agendar</p>
          <p className="mt-1 text-[13px] leading-snug tabular-nums">
            {skip.customer?.full_name ?? "Cliente"} · {when}. {skip.reason}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {skip.customer ? (
          <Button
            size="touch"
            className="flex-1 border-amber-900 bg-amber-900 text-white hover:bg-amber-900/90"
            onClick={onReschedule}
            disabled={pending}
          >
            Elegir otro horario
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="touch"
          className="flex-1 border-amber-200 bg-white text-amber-950 hover:bg-amber-50"
          onClick={dismiss}
          disabled={pending}
        >
          {pending ? "Cerrando…" : "Saltear esa fecha"}
        </Button>
      </div>
    </section>
  );
}
