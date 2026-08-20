"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";

import { BookingFields, type ContactField, type ContactValues } from "@/components/public/booking-fields";
import { Field, inputClass } from "@/components/public/form-field";
import { lookupCustomerByDni, type CustomerLookupResult } from "@/lib/actions/booking";
import { normalizeDni } from "@/lib/validation/schemas";

export type Identity = { resolved: boolean; displayName: string | null };

const EMPTY_CONTACT: ContactValues = { fullName: "", phone: "", email: "" };
const DEBOUNCE_MS = 400;

type Lookup = { status: "idle" } | CustomerLookupResult;

const EMPTY_ERRORS: Record<string, string> = {};

/**
 * Punto de identificación del paso 3: un solo campo de DNI que, según exista
 * o no, reconoce al cliente o despliega el alta.
 *
 * El reconocimiento es una conveniencia de UX, nunca la fuente de verdad:
 * `createBooking` vuelve a resolver el DNI contra la base en el propio
 * request, así que un lookup manipulado desde el cliente no puede hacer que
 * el turno quede a nombre de otra persona.
 */
export function DniGate({
  errors = EMPTY_ERRORS,
  onIdentityChange,
}: {
  errors?: Record<string, string>;
  onIdentityChange: (identity: Identity) => void;
}) {
  const [dniInput, setDniInput] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const [editing, setEditing] = useState(false);
  const [contact, setContact] = useState<ContactValues>(EMPTY_CONTACT);
  const [checking, startChecking] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Solo limpia el timer pendiente al desmontar: disparar la consulta es
  // responsabilidad de `handleDniChange`, no de este efecto.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function resetLookup() {
    setLookup({ status: "idle" });
    setEditing(false);
    setContact(EMPTY_CONTACT);
  }

  // Reacciona a la tecla, no a un efecto: el debounce solo pospone *cuándo*
  // se dispara la consulta, pero quién la dispara es siempre este handler.
  function handleDniChange(value: string) {
    setDniInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const normalized = normalizeDni(value);
    const isCompleteDni = normalized.length === 7 || normalized.length === 8;

    if (!isCompleteDni) {
      resetLookup();
      return;
    }

    debounceRef.current = setTimeout(() => {
      startChecking(async () => {
        const result = await lookupCustomerByDni(normalized);
        setLookup(result);
        setEditing(false);
        setContact(
          result.status === "found"
            ? { fullName: result.fullName, phone: result.phone, email: result.email ?? "" }
            : EMPTY_CONTACT,
        );
      });
    }, DEBOUNCE_MS);
  }

  const isFound = lookup.status === "found";
  const isLockedFound = isFound && !editing;
  // Un fallo de la consulta (por ejemplo, el límite de intentos) no debe
  // bloquear la reserva: se degrada al mismo formulario que un DNI nuevo.
  const showContactFields = lookup.status === "not_found" || lookup.status === "error" || (isFound && editing);

  const handleFieldChange = (field: ContactField, value: string) => {
    setContact((prev) => ({ ...prev, [field]: value }));
  };

  // Le informa al paso 3 si ya hay una identificación resuelta (para
  // habilitar "Confirmar turno") y qué nombre mostrar en el resumen. Es una
  // sincronización legítima con el padre, no estado derivable en el render:
  // el padre lo necesita para decidir si el formulario puede enviarse.
  useEffect(() => {
    if (isLockedFound && lookup.status === "found") {
      onIdentityChange({ resolved: true, displayName: lookup.fullName });
      return;
    }

    if (showContactFields) {
      const complete =
        contact.fullName.trim().length >= 2 &&
        contact.phone.trim().length > 0 &&
        contact.email.trim().length > 0;
      onIdentityChange({ resolved: complete, displayName: contact.fullName.trim() || null });
      return;
    }

    onIdentityChange({ resolved: false, displayName: null });
  }, [isLockedFound, showContactFields, contact, lookup, onIdentityChange]);

  return (
    <div className="space-y-5">
      <Field id="dni" label="DNI" error={errors.dni}>
        <input
          id="dni"
          name="dni"
          inputMode="numeric"
          autoComplete="off"
          placeholder="30123456"
          value={dniInput}
          onChange={(e) => handleDniChange(e.target.value)}
          className={inputClass}
          required
          aria-invalid={Boolean(errors.dni)}
        />
      </Field>

      {checking ? <p className="text-muted-foreground text-sm">Buscando…</p> : null}

      {lookup.status === "error" ? (
        <p className="text-muted-foreground text-sm">
          {lookup.message} Mientras tanto, completá tus datos abajo.
        </p>
      ) : null}

      {isLockedFound && lookup.status === "found" ? (
        <div className="border-border bg-[var(--hs-surface-raised)] space-y-2 border p-4">
          <p className="flex items-center gap-2 text-sm">
            <Check className="size-4 shrink-0" />
            Hola, {lookup.fullName}
          </p>
          <p className="text-muted-foreground text-sm">{lookup.email}</p>
          <p className="text-muted-foreground text-sm">{lookup.phone}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 pt-1 text-xs tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Pencil className="size-3.5" />
            Editar mis datos
          </button>
        </div>
      ) : null}

      {showContactFields ? (
        <BookingFields errors={errors} defaultValues={contact} onFieldChange={handleFieldChange} />
      ) : null}
    </div>
  );
}
