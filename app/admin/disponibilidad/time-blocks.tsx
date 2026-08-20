"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
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

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Bloqueando…" : "Bloquear"}
    </Button>
  );
}

export function TimeBlockForm({ todayKey }: { todayKey: string }) {
  const [state, formAction] = useActionState(createTimeBlock, idleState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
    }
    if (state.status === "error") toast.error(state.message);
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
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteTimeBlock(block.id);
                  toast.success("Bloqueo eliminado.");
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "No se pudo eliminar.",
                  );
                }
              })
            }
          >
            <Trash2 className="text-destructive size-4" />
            <span className="sr-only">Eliminar bloqueo</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
