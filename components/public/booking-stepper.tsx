"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import { BookingSummary } from "@/components/public/booking-summary";
import { DateStrip } from "@/components/public/date-strip";
import { DniGate, type Identity } from "@/components/public/dni-gate";
import { Field, inputClass } from "@/components/public/form-field";
import { ServiceOption } from "@/components/public/service-option";
import { StepIndicator, type StepNumber } from "@/components/public/step-indicator";
import { StepShell } from "@/components/public/step-shell";
import { TimeSlotGrid, type Slot } from "@/components/public/time-slot-grid";
import { createBooking, fetchSlots } from "@/lib/actions/booking";
import { idleState } from "@/lib/actions/result";
import type { Service } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Deriva `yyyy-MM-dd` de la fecha elegida en el calendario.
 *
 * Se leen los campos locales en vez de usar `toISOString()`: el calendario
 * entrega la medianoche del navegador, y en Argentina eso en UTC ya es el día
 * siguiente. Convertir por ISO correría todas las reservas un día.
 */
function calendarDateToKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const UNRESOLVED_IDENTITY: Identity = { resolved: false, displayName: null };

export function BookingStepper({
  services,
  closedWeekdays,
  horizonDays,
}: {
  services: Service[];
  closedWeekdays: number[];
  horizonDays: number;
}) {
  const [step, setStep] = useState<StepNumber>(1);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, startLoadingSlots] = useTransition();
  const [identity, setIdentity] = useState<Identity>(UNRESOLVED_IDENTITY);
  const [state, formAction] = useActionState(createBooking, idleState);

  // Los horarios ofrecidos dependen del servicio (los slots se encadenan según
  // su duración), así que cambiar de servicio invalida la selección de hora.
  function selectService(next: Service) {
    if (next.id === service?.id) return;
    setService(next);
    setSlot(null);
    setSlots(null);
  }

  function selectDate(next: Date) {
    setDate(next);
    setSlot(null);
    setSlots(null);
  }

  useEffect(() => {
    if (!service || !date) return;
    const dateKey = calendarDateToKey(date);
    startLoadingSlots(async () => {
      setSlots(await fetchSlots(service.id, dateKey));
    });
  }, [service, date]);

  const summary = (
    <BookingSummary
      service={service}
      dateLabel={date ? dateFormatter.format(date) : null}
      timeLabel={slot ? `${slot.label} h` : null}
      customerName={step === 3 ? identity.displayName : null}
    />
  );

  return (
    <section
      id="reservar"
      // `tabIndex={-1}` la vuelve enfocable por programa sin meterla en el orden
      // de tabulación: `HeroCta` le pasa el foco al bajar, para que quien navega
      // con teclado siga desde acá y no desde la portada. El anillo se oculta
      // porque el foco lo pone el código, no el usuario.
      tabIndex={-1}
      className="flex min-h-dvh scroll-mt-0 flex-col px-6 py-10 focus:outline-none sm:px-10"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <StepIndicator current={step} />

        <div className="mt-8 grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
          {step === 1 ? (
            <StepShell
              title="¿Qué te hacés?"
              hint="La duración del servicio define los horarios disponibles."
              canContinue={Boolean(service)}
              onContinue={() => setStep(2)}
            >
              <div className="space-y-2">
                {services.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No hay servicios disponibles en este momento.
                  </p>
                ) : (
                  services.map((item) => (
                    <ServiceOption
                      key={item.id}
                      service={item}
                      selected={service?.id === item.id}
                      onSelect={() => selectService(item)}
                    />
                  ))
                )}
              </div>
            </StepShell>
          ) : null}

          {step === 2 && service ? (
            <StepShell
              title="Elegí fecha y horario"
              onBack={() => setStep(1)}
              canContinue={Boolean(slot)}
              onContinue={() => setStep(3)}
            >
              <div className="space-y-6">
                <DateStrip
                  value={date}
                  onChange={selectDate}
                  closedWeekdays={closedWeekdays}
                  horizonDays={horizonDays}
                />

                {!date ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    Elegí un día para ver los horarios.
                  </p>
                ) : (
                  <TimeSlotGrid
                    slots={slots}
                    loading={loadingSlots}
                    selected={slot}
                    onSelect={setSlot}
                    serviceName={service.name}
                  />
                )}
              </div>
            </StepShell>
          ) : null}

          {step === 3 && service && slot ? (
            <form action={formAction} className="flex min-h-0 flex-col">
              <input type="hidden" name="serviceId" value={service.id} />
              <input type="hidden" name="startsAt" value={slot.startsAt} />

              <StepShell
                title="Tus datos"
                hint="Ingresá tu DNI: si ya reservaste antes, reconocemos tus datos."
                onBack={() => setStep(2)}
                continueType="submit"
                continueLabel="Confirmar turno"
                canContinue={identity.resolved}
              >
                <div className="space-y-6">
                  <DniGate errors={state.fieldErrors} onIdentityChange={setIdentity} />

                  <Field id="note" label="Algo que quieras aclarar (opcional)" error={state.fieldErrors?.note}>
                    <textarea id="note" name="note" rows={2} className={cn(inputClass, "resize-none")} />
                  </Field>
                </div>

                {state.status === "error" && !state.fieldErrors ? (
                  <p className="border-destructive/40 text-destructive mt-5 border p-3 text-sm">
                    {state.message}
                  </p>
                ) : null}
              </StepShell>
            </form>
          ) : null}

          <div className="lg:sticky lg:top-10 lg:self-start">{summary}</div>
        </div>
      </div>
    </section>
  );
}
