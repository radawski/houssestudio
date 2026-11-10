"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAdminAppointment,
  fetchAdminSlots,
  getNewAppointmentOptions,
  type CustomerOption,
  type ServiceOption,
} from "@/lib/actions/admin-booking";
import { matchesCustomerQuery } from "@/lib/customer-summary";
import { addDaysToKey, todayKey, weekRange } from "@/lib/dates";
import { formatCurrency, formatDuration, formatInTz } from "@/lib/format";
import {
  OCCURRENCES_AHEAD,
  REPEAT_OPTIONS,
  listDates,
  occurrenceDates,
  ruleFromChoice,
  type RepeatChoice,
} from "@/lib/recurring";
import { toastActionError } from "@/lib/toast-error";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;
const inputClass = "h-12 text-base md:h-10 md:text-sm";

type NewCustomerFields = { dni: string; fullName: string; phone: string; email: string };
const EMPTY_NEW: NewCustomerFields = { dni: "", fullName: "", phone: "", email: "" };

/**
 * "Nuevo turno" desde el panel (plan de noviembre, T1; prototipo
 * NuevoTurnoCliente / NuevoTurnoHorario). Dos pasos: a quién (buscador o
 * cliente nuevo) y qué/cuándo (servicio, día y un horario de la grilla). El
 * turno queda confirmado.
 *
 * Los clientes y servicios se piden al abrir la hoja, no con cada carga de la
 * Agenda. Sin foco automático al abrir, como todas las hojas del panel.
 *
 * "Repetir" (T2) lo vuelve un turno fijo. Con `preset` la hoja arranca en el
 * paso 2 con el cliente y el servicio ya elegidos: es "Elegir otro horario"
 * del aviso de Hoy, para reemplazar una fecha salteada de un turno fijo.
 */
export function NewAppointmentSheet({
  open,
  onOpenChange,
  initialDateKey,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Día con el que arranca la tira (el que se está mirando en la Agenda). */
  initialDateKey?: string;
  preset?: { customerId: string; customerName: string; serviceId: string | null; skipId: string };
}) {
  const today = todayKey();
  const startKey = initialDateKey && initialDateKey >= today ? initialDateKey : today;

  const [options, setOptions] = useState<{ customers: CustomerOption[]; services: ServiceOption[] } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState<1 | 2>(preset ? 2 : 1);
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<CustomerOption | null>(
    preset ? { id: preset.customerId, full_name: preset.customerName, dni: "", phone: "", noShows: 0 } : null,
  );
  const [newMode, setNewMode] = useState(false);
  const [fields, setFields] = useState<NewCustomerFields>(EMPTY_NEW);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [chosenServiceId, setChosenServiceId] = useState(preset?.serviceId ?? "");
  const [repeat, setRepeat] = useState<RepeatChoice>("no");
  const [dayKey, setDayKeyState] = useState(startKey);
  // Los horarios quedan guardados con el servicio y el día a los que
  // corresponden: si cambia alguno, los viejos dejan de mostrarse solos.
  const [slotsFor, setSlotsFor] = useState<{ key: string; list: { startsAt: string; label: string }[] } | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // Un servicio que ya no está activo no se ofrece: cae al primero.
  const serviceId =
    (options?.services.some((s) => s.id === chosenServiceId) ? chosenServiceId : options?.services[0]?.id) ??
    chosenServiceId;
  const slotsKey = `${serviceId}|${dayKey}`;
  const slots = slotsFor?.key === slotsKey ? slotsFor.list : null;

  function setDayKey(key: string) {
    setDayKeyState(key);
    setSlot(null);
  }

  function setServiceId(id: string) {
    setChosenServiceId(id);
    setSlot(null);
  }

  // Al abrir, pide clientes y servicios. La hoja arranca de cero en cada
  // apertura porque quien la abre la vuelve a montar (`key`).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getNewAppointmentOptions()
      .then((result) => !cancelled && setOptions(result))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Horarios libres del día y servicio elegidos.
  useEffect(() => {
    if (!open || step !== 2 || !serviceId) return;
    let cancelled = false;
    const key = `${serviceId}|${dayKey}`;
    fetchAdminSlots(serviceId, dayKey)
      .then((list) => !cancelled && setSlotsFor({ key, list }))
      .catch(() => !cancelled && setSlotsFor({ key, list: [] }));
    return () => {
      cancelled = true;
    };
  }, [open, step, serviceId, dayKey]);

  const week = weekRange(dayKey).days;
  const firstWeekDay = week[0];
  const canGoBack = firstWeekDay > today;
  const service = options?.services.find((s) => s.id === serviceId);
  const who = customer?.full_name ?? (newMode ? fields.fullName.trim() : "");
  const rule = preset ? null : ruleFromChoice(repeat, dayKey);
  const ruleDates = rule ? occurrenceDates(rule, dayKey, OCCURRENCES_AHEAD) : [];

  function goToStep2() {
    if (newMode) {
      const errors: Record<string, string> = {};
      if (!/^\d{7,8}$/.test(fields.dni.replace(/\D/g, ""))) errors.dni = "DNI de 7 u 8 números.";
      if (fields.fullName.trim().length < 2) errors.fullName = "Escribí nombre y apellido.";
      if (fields.phone.replace(/\D/g, "").length < 10) errors.phone = "Teléfono con característica.";
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        return;
      }
    }
    setFieldErrors(undefined);
    setStep(2);
  }

  function submit() {
    if (!slot || !serviceId) return;
    startSaving(async () => {
      try {
        const result = await createAdminAppointment({
          customerId: customer?.id,
          newCustomer: newMode ? { ...fields, dni: fields.dni.replace(/\D/g, "") } : undefined,
          serviceId,
          startsAt: slot,
          repeat: preset ? "no" : repeat,
          resolvesSkipId: preset?.skipId,
        });
        if (result.status === "success") {
          toast.success(result.message);
          onOpenChange(false);
          return;
        }
        if (result.fieldErrors) {
          // El servidor rechazó los datos del cliente nuevo: se corrigen en el paso 1.
          setFieldErrors(result.fieldErrors);
          setStep(1);
        }
        toast.error(result.message);
        if (/horario/.test(result.message)) {
          // Ese horario se ocupó: se vuelven a pedir los libres.
          setSlot(null);
          setSlotsFor(null);
          fetchAdminSlots(serviceId, dayKey)
            .then((list) => setSlotsFor({ key: slotsKey, list }))
            .catch(() => setSlotsFor({ key: slotsKey, list: [] }));
        }
      } catch (error) {
        toastActionError(error, "No se pudo agendar el turno.", submit);
      }
    });
  }

  const filtered = options ? options.customers.filter((c) => matchesCustomerQuery(c, query)).slice(0, 30) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo turno</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Paso 1 de 2 · ¿Para quién es?" : "Paso 2 de 2 · Servicio y horario"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-1.5" aria-hidden>
          <span className="bg-foreground h-1 flex-1 rounded-full" />
          <span className={cn("h-1 flex-1 rounded-full", step === 2 ? "bg-foreground" : "bg-[var(--hs-divider)]")} />
        </div>

        {loadError ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-muted-foreground text-sm">No pudimos cargar los clientes y servicios.</p>
            <Button variant="outline" size="touch" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            {newMode ? (
              <div className="space-y-3.5">
                <NewCustomerField id="new-dni" label="DNI" value={fields.dni} error={fieldErrors?.dni} inputMode="numeric"
                  onChange={(dni) => setFields({ ...fields, dni })} />
                <NewCustomerField id="new-name" label="Nombre y apellido" value={fields.fullName} error={fieldErrors?.fullName}
                  onChange={(fullName) => setFields({ ...fields, fullName })} />
                <NewCustomerField id="new-phone" label="Teléfono / WhatsApp" value={fields.phone} error={fieldErrors?.phone}
                  type="tel" onChange={(phone) => setFields({ ...fields, phone })} />
                <NewCustomerField id="new-email" label="Email (opcional)" value={fields.email} error={fieldErrors?.email}
                  type="email" onChange={(email) => setFields({ ...fields, email })}
                  hint="Con email le llega la confirmación y el recordatorio." />
                <div className="flex flex-col gap-2 pt-1">
                  <Button size="touch-xl" onClick={goToStep2}>
                    Continuar
                  </Button>
                  <Button variant="ghost" size="touch-lg" onClick={() => setNewMode(false)}>
                    Buscar un cliente existente
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="new-appointment-search">Buscar cliente</Label>
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="new-appointment-search"
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Nombre, DNI o teléfono"
                      autoComplete="off"
                      className={cn(inputClass, "pl-9")}
                    />
                  </div>
                </div>

                {!options ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">Cargando clientes…</p>
                ) : filtered.length === 0 ? (
                  <p className="text-muted-foreground py-3 text-center text-sm">
                    {query.trim() ? "No hay clientes que coincidan." : "Todavía no hay clientes."}
                  </p>
                ) : (
                  <ul className="-mx-1 max-h-[38vh] divide-y divide-[var(--hs-divider)] overflow-y-auto">
                    {filtered.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomer(option);
                            setStep(2);
                          }}
                          className="hover:bg-accent flex min-h-14 w-full items-center gap-3 rounded-md px-1 py-2 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium">{option.full_name}</span>
                            <span className="text-muted-foreground block text-[13px] tabular-nums">
                              DNI {option.dni} · {option.phone}
                            </span>
                          </span>
                          {option.noShows > 0 ? (
                            <span className="inline-flex h-[22px] shrink-0 items-center rounded-full border border-[#f3c9c4] bg-[#fdeeec] px-2 text-[11px] font-medium text-[#9a2a22]">
                              Faltó {option.noShows}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  variant="outline"
                  size="touch-lg"
                  className="w-full"
                  onClick={() => {
                    setNewMode(true);
                    setCustomer(null);
                  }}
                >
                  <UserPlus className="size-4" />
                  Cliente nuevo
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={Boolean(preset)}
              className="flex min-h-11 w-full items-center justify-between rounded-md border border-[var(--hs-border-card)] px-3 text-left text-sm disabled:cursor-default"
            >
              <span className="truncate">
                <span className="font-medium">{who}</span>
                {customer?.dni ? <span className="text-muted-foreground tabular-nums"> · DNI {customer.dni}</span> : null}
                {newMode ? <span className="text-muted-foreground"> · cliente nuevo</span> : null}
              </span>
              {preset ? null : <span className="shrink-0 text-[13px] font-medium">Cambiar</span>}
            </button>

            <div className="space-y-1.5">
              <Label htmlFor="new-appointment-service">Servicio</Label>
              <select
                id="new-appointment-service"
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className="border-input bg-card h-12 w-full rounded-md border px-3 text-base md:h-10 md:text-sm"
              >
                {options?.services.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} · {formatDuration(option.duration_minutes)} · {formatCurrency(option.price)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                Día{" "}
                <span className="text-muted-foreground font-normal tabular-nums">
                  · {formatInTz(`${week[0]}T12:00:00Z`, "d/M")} al {formatInTz(`${week[6]}T12:00:00Z`, "d/M")}
                </span>
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Semana anterior"
                  disabled={!canGoBack}
                  onClick={() => {
                    const target = addDaysToKey(dayKey, -7);
                    setDayKey(target < today ? today : target);
                  }}
                  className="flex h-13 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--hs-mist)] disabled:opacity-35"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {week.map((key, index) => {
                  const past = key < today;
                  const selected = key === dayKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={past}
                      aria-pressed={selected}
                      onClick={() => setDayKey(key)}
                      className={cn(
                        "flex h-13 min-w-0 flex-1 flex-col items-center justify-center rounded-md border text-center disabled:opacity-35",
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "bg-card text-muted-foreground border-[var(--hs-border-card)]",
                      )}
                    >
                      <span className="text-[10px] tracking-wide uppercase">{DAY_LABELS[index]}</span>
                      <span className="text-[15px] font-semibold tabular-nums">{Number(key.slice(8))}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-label="Semana siguiente"
                  onClick={() => setDayKey(addDaysToKey(dayKey, 7))}
                  className="flex h-13 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--hs-mist)]"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Horario libre</p>
              {slots === null ? (
                <p className="text-muted-foreground py-2 text-sm">Buscando horarios…</p>
              ) : slots.length === 0 ? (
                <p className="text-muted-foreground py-2 text-sm">No hay horarios libres ese día.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map((option) => (
                    <button
                      key={option.startsAt}
                      type="button"
                      aria-pressed={slot === option.startsAt}
                      onClick={() => setSlot(option.startsAt)}
                      className={cn(
                        "h-11 rounded-md border text-sm font-medium tabular-nums",
                        slot === option.startsAt
                          ? "border-foreground bg-foreground text-background"
                          : "bg-card border-[var(--hs-mist)]",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground text-xs">Los mismos horarios que ve el cliente en la reserva.</p>
            </div>

            {preset ? null : (
              <div className="space-y-1.5">
                <p className="text-sm font-medium" id="new-appointment-repeat">
                  Repetir
                </p>
                <div
                  role="group"
                  aria-labelledby="new-appointment-repeat"
                  className="flex gap-0.5 rounded-md bg-[var(--hs-divider)] p-[3px]"
                >
                  {REPEAT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={repeat === option.value}
                      onClick={() => setRepeat(option.value)}
                      className={cn(
                        "h-10 min-w-0 flex-1 rounded-[4px] text-[13px]",
                        repeat === option.value ? "bg-card text-foreground font-medium shadow-xs" : "text-muted-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {rule ? (
                  <p className="text-muted-foreground text-xs leading-relaxed tabular-nums">
                    Turno fijo: se agendan el {listDates(ruleDates)}
                    {slot ? ` a las ${slots?.find((s) => s.startsAt === slot)?.label ?? ""}` : ""}. Después se siguen
                    sumando solos. Si alguna fecha está ocupada, se saltea y te avisamos en Hoy.
                  </p>
                ) : null}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button size="touch-xl" disabled={!slot || !service || saving} onClick={submit}>
                {saving ? "Agendando…" : rule ? "Agendar turno fijo" : "Agendar turno"}
              </Button>
              <Button
                variant="ghost"
                size="touch-lg"
                onClick={() => (preset ? onOpenChange(false) : setStep(1))}
                disabled={saving}
              >
                {preset ? "Cancelar" : "Volver"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewCustomerField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        className={inputClass}
        aria-invalid={Boolean(error)}
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
