"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Field, inputClass } from "@/components/public/form-field";
import { StatusBadge } from "@/components/status-badge";
import {
  exitMyAppointments,
  lookupMyAppointments,
  type MyAppointmentsResult,
} from "@/lib/actions/my-appointments";
import type { MyAppointment, MyAppointmentsList } from "@/lib/data/my-appointments";
import { cn } from "@/lib/utils";

const primaryButton =
  "bg-foreground text-background hover:bg-[var(--hs-graphite)] focus-visible:ring-ring inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 py-3 text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60";

type Found = Extract<MyAppointmentsResult, { status: "found" }>;

/**
 * "Mis turnos": el cliente escribe su DNI y su teléfono y ve sus turnos, sin
 * buscar el mail.
 *
 * Cada turno abre `/turno/<token>`, la misma página del mail, donde se ve el
 * detalle y se cancela dentro de la ventana permitida. Al volver, la página
 * trae la lista de la sesión corta (`initial`) y no pide los datos de nuevo.
 */
export function MyAppointments({ initial }: { initial: MyAppointmentsList | null }) {
  const [state, formAction, pending] = useActionState<MyAppointmentsResult, FormData>(
    lookupMyAppointments,
    initial ? { status: "found", ...initial } : { status: "idle" },
  );
  // "Salir" vuelve al formulario sin otra consulta: se recuerda qué resultado
  // se descartó, y solo se muestra la lista si llega uno nuevo.
  const [dismissed, setDismissed] = useState<MyAppointmentsResult | null>(null);
  // Controlados: React vacía los campos sin controlar después de cada envío,
  // y ante un "no encontramos" el cliente tendría que escribir todo de nuevo.
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");

  if (state.status === "found" && state !== dismissed) {
    return (
      <AppointmentList
        result={state}
        onExit={() => {
          // "Salir" cierra la sesión y borra los datos: el celular puede ser
          // prestado. La lista se oculta al toque, sin esperar al servidor.
          setDismissed(state);
          setDni("");
          setPhone("");
          void exitMyAppointments();
        }}
      />
    );
  }

  const error = state.status === "error" ? state.message : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-[var(--hs-tracking-tight)] sm:text-4xl">Mis turnos</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Ingresá tu DNI y el teléfono con el que reservaste para ver tus turnos.
        </p>
      </div>

      <form action={formAction} className="space-y-6" noValidate>
        <div className="space-y-5">
          <Field id="dni" label="DNI">
            <input
              id="dni"
              name="dni"
              inputMode="numeric"
              autoComplete="off"
              required
              value={dni}
              onChange={(event) => setDni(event.target.value)}
              className={cn(inputClass, "tabular-nums")}
              aria-invalid={Boolean(error)}
            />
          </Field>
          <Field id="phone" label="Teléfono">
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-describedby="phone-hint"
              className={cn(inputClass, "tabular-nums")}
              aria-invalid={Boolean(error)}
            />
            <p id="phone-hint" className="text-muted-foreground text-xs">
              Con característica, sin 0 ni 15. Ej.: 342 597 2035
            </p>
          </Field>
        </div>

        {error ? (
          <p role="alert" className="border-destructive/40 text-destructive border p-3 text-sm">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Buscando…" : "Ver mis turnos"}
        </button>
      </form>

      <p className="text-muted-foreground text-center text-xs">
        No guardamos tu DNI ni tu teléfono. La sesión se cierra sola a los 30 minutos.
      </p>
    </div>
  );
}

function AppointmentList({ result, onExit }: { result: Found; onExit: () => void }) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-[var(--hs-tracking-tight)] sm:text-4xl">
            Hola, {result.name}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">Tocá un turno para ver el detalle o cancelarlo.</p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="text-muted-foreground hover:text-foreground min-h-11 shrink-0 text-sm"
        >
          Salir
        </button>
      </div>

      <Section title="Próximos" appointments={result.upcoming} empty="No tenés turnos próximos." />
      {result.past.length > 0 ? <Section title="Anteriores" appointments={result.past} muted /> : null}

      <Link href="/#reservar" className={primaryButton}>
        Reservar otro turno
      </Link>
    </div>
  );
}

function Section({
  title,
  appointments,
  empty,
  muted = false,
}: {
  title: string;
  appointments: MyAppointment[];
  empty?: string;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-2 text-xs tracking-[0.08em] uppercase">{title}</h2>
      {appointments.length === 0 ? (
        <p className="border-border text-muted-foreground border-y py-4 text-sm">{empty}</p>
      ) : (
        <ul className="border-border divide-border divide-y border-y">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <AppointmentRow appointment={appointment} muted={muted} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AppointmentRow({ appointment, muted }: { appointment: MyAppointment; muted: boolean }) {
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[17px] font-light first-letter:uppercase", muted && "text-muted-foreground")}>
          {appointment.date}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-[13px] tabular-nums">
          {appointment.time} · {appointment.service}
          {muted ? null : ` · ${appointment.price}`}
        </span>
      </span>
      <StatusBadge status={appointment.status} className="shrink-0" />
      {appointment.href ? <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden /> : null}
    </>
  );

  const className = "flex min-h-[76px] items-center gap-3 py-3.5";

  return appointment.href ? (
    <Link href={appointment.href} className={cn(className, "hover:bg-[var(--hs-surface-raised)]")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
