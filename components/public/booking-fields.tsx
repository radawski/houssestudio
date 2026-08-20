"use client";

import { Field, inputClass } from "@/components/public/form-field";
import { cn } from "@/lib/utils";

export type ContactValues = { fullName: string; phone: string; email: string };
export type ContactField = keyof ContactValues;

/**
 * Datos de contacto: nombre, teléfono y email.
 *
 * Se usa en dos momentos, siempre adentro de `DniGate`: dar de alta a un
 * cliente nuevo (vacío) o editar los datos de uno reconocido (`defaultValues`
 * precargados). Los inputs quedan sin controlar (`defaultValue`, no `value`)
 * para que el envío del formulario siga siendo un `FormData` nativo; el
 * `onFieldChange` es solo para que `DniGate` sepa en vivo si ya están
 * completos y pueda habilitar "Confirmar turno".
 */
export function BookingFields({
  errors,
  defaultValues,
  onFieldChange,
}: {
  errors?: Record<string, string>;
  defaultValues?: Partial<ContactValues>;
  onFieldChange?: (field: ContactField, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <Field id="fullName" label="Nombre y apellido" error={errors?.fullName}>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          defaultValue={defaultValues?.fullName}
          onChange={(e) => onFieldChange?.("fullName", e.target.value)}
          className={inputClass}
          aria-invalid={Boolean(errors?.fullName)}
        />
      </Field>

      <Field id="phone" label="Teléfono / WhatsApp" error={errors?.phone}>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="11 2345-6789"
          required
          defaultValue={defaultValues?.phone}
          onChange={(e) => onFieldChange?.("phone", e.target.value)}
          className={cn(inputClass, "placeholder:text-muted-foreground")}
          aria-invalid={Boolean(errors?.phone)}
        />
      </Field>

      <Field id="email" label="Email" error={errors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultValues?.email}
          onChange={(e) => onFieldChange?.("email", e.target.value)}
          className={inputClass}
          aria-invalid={Boolean(errors?.email)}
        />
      </Field>
    </div>
  );
}
