"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { MessageCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelByToken } from "@/lib/actions/booking";
import { idleState } from "@/lib/actions/result";
import { toWhatsappNumber } from "@/lib/phone";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Cancelando…" : "Cancelar turno"}
    </Button>
  );
}

const OUT_OF_WINDOW_MESSAGE =
  "Ya estás dentro del plazo mínimo para cancelar por tu cuenta. Coordiná el cambio directamente con el local.";

function WhatsappFallback({
  message,
  businessWhatsapp,
}: {
  message: string;
  businessWhatsapp: string | null;
}) {
  const number = businessWhatsapp ? toWhatsappNumber(businessWhatsapp) : null;
  const waMessage =
    "Hola, quería cancelar mi turno pero ya estoy dentro del plazo mínimo. ¿Me ayudás a coordinarlo?";

  return (
    <div className="border-border bg-[var(--hs-surface-raised)] border p-5">
      <p className="text-sm">{message}</p>

      {number ? (
        <a
          href={`https://wa.me/${number}?text=${encodeURIComponent(waMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-foreground text-background hover:bg-[var(--hs-graphite)] focus-visible:ring-ring mt-4 inline-flex items-center gap-2 px-5 py-3 text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <MessageCircle className="size-4" />
          Coordinar por WhatsApp
        </a>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          Comunicate con el local para coordinar la cancelación.
        </p>
      )}
    </div>
  );
}

/**
 * Botón de autogestión en `/turno/[token]`: cancela sin sesión, con el token
 * como única credencial. `cancelByToken` ya resuelve la ventana y el estado
 * dentro del propio `UPDATE`; acá solo se refleja lo que esa acción devuelve.
 *
 * `withinWindow` en `false` viene de la página (el plazo ya venció antes de
 * intentar nada) y evita mandar a nadie a un diálogo de cancelar que el
 * servidor va a rechazar. El código `fuera_de_ventana` de la acción cubre la
 * carrera contraria: el plazo vence en el rato entre que se abrió la página
 * y se confirmó el diálogo. Los dos casos terminan en el mismo cartel.
 */
export function CancelAppointmentButton({
  token,
  businessWhatsapp,
  withinWindow,
}: {
  token: string;
  businessWhatsapp: string | null;
  withinWindow: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(cancelByToken, idleState);

  if (!withinWindow) {
    return <WhatsappFallback message={OUT_OF_WINDOW_MESSAGE} businessWhatsapp={businessWhatsapp} />;
  }

  if (state.status === "error" && state.code === "fuera_de_ventana") {
    return <WhatsappFallback message={state.message ?? OUT_OF_WINDOW_MESSAGE} businessWhatsapp={businessWhatsapp} />;
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <X className="size-4" />
        Cancelar turno
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
            <DialogDescription>
              El horario queda libre al instante. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                name="reason"
                rows={3}
                placeholder="Se me complicó el horario…"
              />
            </div>

            {state.status === "error" ? (
              <p className="border-destructive/40 text-destructive border p-3 text-sm">
                {state.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Volver
              </Button>
              <SubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
