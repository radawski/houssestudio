"use client";

import { useActionState, useEffect, useEffectEvent, useRef, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTimeBlock, deleteTimeBlock } from "@/lib/actions/availability";
import { idleState } from "@/lib/actions/result";
import { formatLongDate, formatTime } from "@/lib/format";
import type { TimeBlock } from "@/lib/supabase/database.types";
import { toastActionError, toastError } from "@/lib/toast-error";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Bloqueando…" : "Bloquear"}
    </Button>
  );
}

export function TimeBlockForm({
  todayKey,
  onSaved,
}: {
  todayKey: string;
  /** Lo usa la hoja mobile para cerrarse después de bloquear. */
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState(createTimeBlock, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  // Ver `BookingWindowForm`: evento, no dependencia del efecto.
  const notifySaved = useEffectEvent(() => onSaved?.());

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
      notifySaved();
    }
    // Sin "Reintentar": casi siempre es una regla del negocio (se pisa con un
    // turno, el fin antes del inicio) que hay que corregir en el formulario.
    if (state.status === "error") toastError(state.message ?? "No se pudo crear el bloqueo.");
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" name="date" type="date" defaultValue={todayKey} min={todayKey} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Desde</Label>
          <Input id="startTime" name="startTime" type="time" defaultValue="13:00" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Hasta</Label>
          <Input id="endTime" name="endTime" type="time" defaultValue="14:00" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Motivo (opcional)</Label>
        <Input id="reason" name="reason" placeholder="Almuerzo, trámite, feriado…" />
      </div>

      {state.status === "error" ? (
        <p className="text-destructive text-sm">{state.message}</p>
      ) : null}

      <AddButton />
    </form>
  );
}

export function TimeBlockList({ blocks }: { blocks: TimeBlock[] }) {
  const [pending, startTransition] = useTransition();

  if (blocks.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        No hay bloqueos próximos.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {blocks.map((block) => (
        <li key={block.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium first-letter:uppercase">
              {formatLongDate(block.starts_at)}
            </p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {formatTime(block.starts_at)} – {formatTime(block.ends_at)}
              {block.reason ? ` · ${block.reason}` : ""}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={function run() {
              startTransition(async () => {
                try {
                  await deleteTimeBlock(block.id);
                  toast.success("Bloqueo eliminado.");
                } catch (error) {
                  toastActionError(error, "No se pudo eliminar el bloqueo.", run);
                }
              });
            }}
          >
            <Trash2 className="text-destructive size-4" />
            <span className="sr-only">Eliminar bloqueo</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
