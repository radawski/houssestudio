"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type EditableRange = {
  /** Solo para la `key` de React: los bloques no tienen identidad propia. */
  key: string;
  /** `HH:MM`. */
  opensAt: string;
  /** `HH:MM`. */
  closesAt: string;
};

/** La base guarda `HH:MM:SS`; el input `type="time"` espera `HH:MM`. */
export const toInputTime = (value: string) => value.slice(0, 5);

let nextKey = 0;
export function newRangeKey() {
  nextKey += 1;
  return `r${nextKey}`;
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Bloque sugerido al tocar "+ Agregar bloque": arranca una hora después del
 * último cierre y dura dos horas, así no nace pisando al anterior. Sin
 * bloques previos, 09:00 a 13:00.
 */
export function suggestedRange(ranges: EditableRange[]): EditableRange {
  const last = [...ranges].sort((a, b) => a.opensAt.localeCompare(b.opensAt)).at(-1);
  const opensAt = last ? addMinutes(last.closesAt, 60) : "09:00";
  return { key: newRangeKey(), opensAt, closesAt: addMinutes(opensAt, 120) };
}

/**
 * Lista editable de bloques de un día: cada uno con apertura y cierre, quitar
 * bloque y "+ Agregar bloque". Controlada desde afuera para que la use tanto
 * el formulario semanal como la hoja por día de la Fase G.
 *
 * Los inputs se llaman `opens-<weekday>`/`closes-<weekday>` repetidos: el
 * servidor los lee con `getAll`, en el orden en que aparecen acá.
 */
export function DayRangesEditor({
  weekday,
  dayName,
  ranges,
  onChange,
}: {
  weekday: number;
  dayName: string;
  ranges: EditableRange[];
  onChange: (ranges: EditableRange[]) => void;
}) {
  function update(key: string, patch: Partial<EditableRange>) {
    onChange(ranges.map((range) => (range.key === key ? { ...range, ...patch } : range)));
  }

  return (
    <div className="space-y-2">
      {ranges.map((range, index) => (
        <div key={range.key} className="flex items-center gap-2">
          <Input
            type="time"
            name={`opens-${weekday}`}
            value={range.opensAt}
            onChange={(event) => update(range.key, { opensAt: event.target.value })}
            className="w-32"
            aria-label={`${dayName}, apertura del bloque ${index + 1}`}
            required
          />
          <span className="text-muted-foreground text-sm">a</span>
          <Input
            type="time"
            name={`closes-${weekday}`}
            value={range.closesAt}
            onChange={(event) => update(range.key, { closesAt: event.target.value })}
            className="w-32"
            aria-label={`${dayName}, cierre del bloque ${index + 1}`}
            required
          />
          {/* Con un solo bloque no se ofrece quitarlo: un día sin bloques se
              expresa marcándolo cerrado. */}
          {ranges.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(ranges.filter((r) => r.key !== range.key))}
              aria-label={`Quitar el bloque ${index + 1} del ${dayName.toLowerCase()}`}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground -ml-2"
        onClick={() => onChange([...ranges, suggestedRange(ranges)])}
      >
        <Plus className="size-4" />
        Agregar bloque
      </Button>
    </div>
  );
}
