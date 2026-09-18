"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveBusinessHours } from "@/lib/actions/availability";
import { idleState } from "@/lib/actions/result";
import type { BusinessHour } from "@/lib/supabase/database.types";

const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** La base guarda `HH:MM:SS`; el input `type="time"` espera `HH:MM`. */
const toInputTime = (value: string) => value.slice(0, 5);

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar horarios"}
    </Button>
  );
}

function DayRow({ hour }: { hour: BusinessHour }) {
  const [isOpen, setIsOpen] = useState(!hour.is_closed);
  const [hasSplit, setHasSplit] = useState(Boolean(hour.opens_at_2 && hour.closes_at_2));

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b py-3 last:border-b-0">
      <div className="flex min-w-40 items-center gap-3">
        <Switch
          id={`open-${hour.weekday}`}
          checked={isOpen}
          onCheckedChange={setIsOpen}
          aria-label={`Abierto los ${WEEKDAY_NAMES[hour.weekday]}`}
        />
        <Label htmlFor={`open-${hour.weekday}`} className="font-normal">
          {WEEKDAY_NAMES[hour.weekday]}
        </Label>
      </div>

      {/* El estado del switch se manda como campo oculto: un switch apagado no
          aporta valor al FormData, y el servidor necesita los siete días. */}
      {!isOpen ? <input type="hidden" name={`closed-${hour.weekday}`} value="on" /> : null}

      {isOpen ? (
        <>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              name={`opens-${hour.weekday}`}
              defaultValue={toInputTime(hour.opens_at)}
              className="w-32"
              aria-label={`Apertura ${WEEKDAY_NAMES[hour.weekday]}`}
              required
            />
            <span className="text-muted-foreground text-sm">a</span>
            <Input
              type="time"
              name={`closes-${hour.weekday}`}
              defaultValue={toInputTime(hour.closes_at)}
              className="w-32"
              aria-label={`Cierre ${WEEKDAY_NAMES[hour.weekday]}`}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id={`split-${hour.weekday}`}
              checked={hasSplit}
              onCheckedChange={setHasSplit}
              aria-label={`Horario partido los ${WEEKDAY_NAMES[hour.weekday]}`}
            />
            <Label htmlFor={`split-${hour.weekday}`} className="text-muted-foreground font-normal">
              Horario partido
            </Label>
          </div>

          {hasSplit ? (
            <div className="flex items-center gap-2">
              <input type="hidden" name={`split-${hour.weekday}`} value="on" />
              <Input
                type="time"
                name={`opens2-${hour.weekday}`}
                defaultValue={hour.opens_at_2 ? toInputTime(hour.opens_at_2) : ""}
                className="w-32"
                aria-label={`Apertura del segundo tramo, ${WEEKDAY_NAMES[hour.weekday]}`}
                required
              />
              <span className="text-muted-foreground text-sm">a</span>
              <Input
                type="time"
                name={`closes2-${hour.weekday}`}
                defaultValue={hour.closes_at_2 ? toInputTime(hour.closes_at_2) : ""}
                className="w-32"
                aria-label={`Cierre del segundo tramo, ${WEEKDAY_NAMES[hour.weekday]}`}
                required
              />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <span className="text-muted-foreground text-sm">Cerrado</span>
          {/* La base exige un rango válido incluso en los días cerrados, así que
              se conservan los últimos horarios cargados. */}
          <input type="hidden" name={`opens-${hour.weekday}`} value={toInputTime(hour.opens_at)} />
          <input type="hidden" name={`closes-${hour.weekday}`} value={toInputTime(hour.closes_at)} />
        </>
      )}
    </div>
  );
}

export function BusinessHoursForm({ hours }: { hours: BusinessHour[] }) {
  const [state, formAction] = useActionState(saveBusinessHours, idleState);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  // Lunes primero: es como se lee una semana laboral.
  const ordered = [...hours].sort(
    (a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7),
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        {ordered.map((hour) => (
          <DayRow key={hour.weekday} hour={hour} />
        ))}
      </div>
      <SaveButton />
    </form>
  );
}
