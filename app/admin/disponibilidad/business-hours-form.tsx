"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  DayRangesEditor,
  newRangeKey,
  toInputTime,
  type EditableRange,
} from "@/app/admin/disponibilidad/day-ranges-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveBusinessHours } from "@/lib/actions/availability";
import { idleState } from "@/lib/actions/result";
import type { BusinessDay } from "@/lib/data/availability";

const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar horarios"}
    </Button>
  );
}

function DayRow({ day }: { day: BusinessDay }) {
  const dayName = WEEKDAY_NAMES[day.weekday];
  const [isOpen, setIsOpen] = useState(!day.is_closed);
  const [ranges, setRanges] = useState<EditableRange[]>(() =>
    day.ranges.length > 0
      ? day.ranges.map((range) => ({
          key: newRangeKey(),
          opensAt: toInputTime(range.opens_at),
          closesAt: toInputTime(range.closes_at),
        }))
      : [{ key: newRangeKey(), opensAt: "09:00", closesAt: "19:00" }],
  );

  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b py-3 last:border-b-0">
      <div className="flex h-9 min-w-40 items-center gap-3">
        <Switch
          id={`open-${day.weekday}`}
          checked={isOpen}
          onCheckedChange={setIsOpen}
          aria-label={`Abierto los ${dayName}`}
        />
        <Label htmlFor={`open-${day.weekday}`} className="font-normal">
          {dayName}
        </Label>
      </div>

      {isOpen ? (
        <DayRangesEditor
          weekday={day.weekday}
          dayName={dayName}
          ranges={ranges}
          onChange={setRanges}
        />
      ) : (
        <>
          {/* El estado del switch se manda como campo oculto: un switch
              apagado no aporta valor al FormData, y el servidor necesita los
              siete días. Los bloques viajan igual, ocultos, para que el día
              los conserve y reabrirlo devuelva el horario que tenía. */}
          <input type="hidden" name={`closed-${day.weekday}`} value="on" />
          {ranges.map((range) => (
            <span key={range.key} hidden>
              <input type="hidden" name={`opens-${day.weekday}`} value={range.opensAt} />
              <input type="hidden" name={`closes-${day.weekday}`} value={range.closesAt} />
            </span>
          ))}
          <span className="text-muted-foreground flex h-9 items-center text-sm">Cerrado</span>
        </>
      )}
    </div>
  );
}

export function BusinessHoursForm({ days }: { days: BusinessDay[] }) {
  const [state, formAction] = useActionState(saveBusinessHours, idleState);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  // Lunes primero: es como se lee una semana laboral.
  const ordered = [...days].sort(
    (a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7),
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        {ordered.map((day) => (
          <DayRow key={day.weekday} day={day} />
        ))}
      </div>
      <SaveButton />
    </form>
  );
}
