"use client";

import { cn } from "@/lib/utils";

/**
 * Campos mínimos del último paso.
 *
 * Se mantienen como inputs nativos con `name`, porque el envío sigue siendo un
 * `<form action={serverAction}>`: el navegador arma el FormData solo y la
 * reserva funciona incluso antes de que hidrate el JavaScript.
 */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-muted-foreground block text-xs tracking-[0.08em] uppercase"
      >
        {label}
      </label>
      {children}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

const inputClass =
  "border-border focus:border-foreground focus-visible:ring-ring w-full border bg-transparent px-4 py-3 text-base transition-colors focus-visible:ring-2 focus-visible:outline-none";

export function BookingFields({ errors }: { errors?: Record<string, string> }) {
  return (
    <div className="space-y-5">
      <Field id="fullName" label="Nombre y apellido" error={errors?.fullName}>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
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
          className={inputClass}
          aria-invalid={Boolean(errors?.email)}
        />
      </Field>

      <Field id="note" label="Algo que quieras aclarar (opcional)" error={errors?.note}>
        <textarea id="note" name="note" rows={2} className={cn(inputClass, "resize-none")} />
      </Field>
    </div>
  );
}
