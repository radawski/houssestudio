"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/actions/result";
import { saveBookingWindow } from "@/lib/actions/settings";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Último día reservable, contado en días de calendario desde hoy. */
function lastBookableDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateFormatter.format(date);
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar ventana"}
    </Button>
  );
}

/**
 * Los dos extremos de la ventana de reserva.
 *
 * El límite de días se muestra también como fecha concreta: "30" no dice nada
 * a simple vista, y ver hasta cuándo queda abierta la agenda permite darse
 * cuenta de un error de tipeo sin tener que ir a contar al calendario.
 */
export function BookingWindowForm({
  maxBookingDays,
  minLeadMinutes,
}: {
  maxBookingDays: number;
  minLeadMinutes: number;
}) {
  const [state, formAction] = useActionState(saveBookingWindow, idleState);
  const [days, setDays] = useState(String(maxBookingDays));

  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
    if (state.status === "error" && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  const parsedDays = Number(days);
  const showsPreview = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 365;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maxBookingDays">Se puede reservar hasta (días)</Label>
          <Input
            id="maxBookingDays"
            name="maxBookingDays"
            type="number"
            min={1}
            max={365}
            step={1}
            inputMode="numeric"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            required
            aria-invalid={Boolean(state.fieldErrors?.maxBookingDays)}
          />
          {state.fieldErrors?.maxBookingDays ? (
            <p className="text-destructive text-sm">{state.fieldErrors.maxBookingDays}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {showsPreview
                ? `Hoy, el último día reservable sería el ${lastBookableDate(parsedDays)}.`
                : "Entre 1 y 365 días."}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="minLeadMinutes">Anticipación mínima (minutos)</Label>
          <Input
            id="minLeadMinutes"
            name="minLeadMinutes"
            type="number"
            min={0}
            max={10080}
            step={5}
            inputMode="numeric"
            defaultValue={minLeadMinutes}
            required
            aria-invalid={Boolean(state.fieldErrors?.minLeadMinutes)}
          />
          {state.fieldErrors?.minLeadMinutes ? (
            <p className="text-destructive text-sm">{state.fieldErrors.minLeadMinutes}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Evita que te reserven un turno que arranca en unos minutos.
            </p>
          )}
        </div>
      </div>

      <SaveButton />
    </form>
  );
}
