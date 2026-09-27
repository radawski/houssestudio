"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import {
  DayRangesEditor,
  newRangeKey,
  toInputTime,
  type EditableRange,
} from "@/app/admin/disponibilidad/day-ranges-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveBusinessDay, setBusinessDayOpen } from "@/lib/actions/availability";
import type { BusinessDay } from "@/lib/data/availability";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
/** Para "se aplica a todos los <día>". */
const DAY_PLURALS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

function toEditable(day: BusinessDay): EditableRange[] {
  if (day.ranges.length === 0) return [{ key: newRangeKey(), opensAt: "09:00", closesAt: "19:00" }];
  return day.ranges.map((range) => ({
    key: newRangeKey(),
    opensAt: toInputTime(range.opens_at),
    closesAt: toInputTime(range.closes_at),
  }));
}

function summary(day: BusinessDay) {
  return day.ranges
    .map((range) => `${toInputTime(range.opens_at)}–${toInputTime(range.closes_at)}`)
    .join(" · ");
}

/**
 * Hoja de un día (design/admin-iphone n-SheetHorario, con la lista de bloques
 * de la T5 en lugar del "horario partido" fijo). Guardar escribe solo ese día;
 * "Copiar este horario a todos los días" lo pasa a los siete, respetando si
 * cada uno está abierto o cerrado. Pide un segundo toque porque reemplaza el
 * horario de los otros seis días.
 */
function DaySheet({ day, onClose }: { day: BusinessDay; onClose: () => void }) {
  const dayName = DAY_NAMES[day.weekday];
  const [isOpen, setIsOpen] = useState(!day.is_closed);
  const [ranges, setRanges] = useState(() => toEditable(day));
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(copyToAll: boolean) {
    startTransition(async () => {
      const result = await saveBusinessDay(
        {
          weekday: day.weekday,
          isClosed: !isOpen,
          ranges: ranges.map(({ opensAt, closesAt }) => ({ opensAt, closesAt })),
        },
        { copyToAll },
      );
      if (result.status === "success") {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
        setConfirmCopy(false);
      }
    });
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{dayName}</DialogTitle>
        <DialogDescription>
          Horario semanal · se aplica a todos los {DAY_PLURALS[day.weekday]}.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3.5">
        <div className="flex items-center justify-between rounded-md border border-[var(--hs-border-card)] px-3 py-2.5">
          <Label htmlFor={`sheet-open-${day.weekday}`} className="text-sm font-medium">
            Abierto
          </Label>
          <Switch
            id={`sheet-open-${day.weekday}`}
            size="lg"
            checked={isOpen}
            onCheckedChange={setIsOpen}
          />
        </div>

        <DayRangesEditor
          weekday={day.weekday}
          dayName={dayName}
          ranges={ranges}
          onChange={setRanges}
          disabled={!isOpen}
        />

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full text-[13px]"
          disabled={pending || !isOpen}
          onClick={() => (confirmCopy ? save(true) : setConfirmCopy(true))}
        >
          <Copy className="size-4" />
          {confirmCopy
            ? "Tocá de nuevo: reemplaza el horario de los otros días"
            : "Copiar este horario a todos los días"}
        </Button>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" size="touch-lg" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button type="button" size="touch-xl" onClick={() => save(false)} disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/**
 * Switch abierto/cerrado de una fila. Guarda al instante (decisión del
 * usuario: sin barra de cambios pendientes) y se ve cambiado de inmediato con
 * `useOptimistic`; si el servidor lo rechaza, vuelve solo a su estado real.
 */
function DayOpenSwitch({ day }: { day: BusinessDay }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useOptimistic(!day.is_closed);

  return (
    <div className="flex h-11 w-12 shrink-0 items-center justify-center">
      <Switch
        size="lg"
        checked={open}
        disabled={pending}
        aria-label={`${DAY_NAMES[day.weekday]} abierto`}
        onCheckedChange={(next) =>
          startTransition(async () => {
            setOpen(next);
            const result = await setBusinessDayOpen(day.weekday, next);
            if (result.status === "success") toast.success(result.message);
            else toast.error(result.message);
          })
        }
      />
    </div>
  );
}

function DayRow({ day }: { day: BusinessDay }) {
  const [open, setOpen] = useState(false);
  const closed = day.is_closed || day.ranges.length === 0;

  return (
    <div className="flex h-[52px] items-center gap-2 pl-3.5">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
            aria-label={`Editar el horario del ${DAY_NAMES[day.weekday].toLowerCase()}`}
          >
            <span className="w-[76px] shrink-0 text-sm font-medium">{DAY_NAMES[day.weekday]}</span>
            <span
              className={cn(
                "truncate text-[13px] tabular-nums",
                closed ? "text-[var(--hs-mist)]" : "text-muted-foreground",
              )}
            >
              {closed ? "Cerrado" : summary(day)}
            </span>
          </button>
        </DialogTrigger>
        {/* `key` con `open`: cada apertura arranca de lo guardado, sin restos
            de una edición cancelada. */}
        {open ? <DaySheet key={String(open)} day={day} onClose={() => setOpen(false)} /> : null}
      </Dialog>
      <DayOpenSwitch day={day} />
    </div>
  );
}

/** Horario semanal en el celular (design/admin-iphone n-Disponibilidad): 7 filas de 52px. */
export function WeeklyHoursMobile({ days }: { days: BusinessDay[] }) {
  // Lunes primero: es como se lee una semana laboral.
  const ordered = [...days].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));

  return (
    <div className="bg-card divide-y divide-[var(--hs-divider)] rounded-md border border-[var(--hs-border-card)]">
      {ordered.map((day) => (
        <DayRow key={day.weekday} day={day} />
      ))}
    </div>
  );
}
