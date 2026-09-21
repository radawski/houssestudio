"use client";

import { useState } from "react";

import { AdminStatusBadge } from "@/components/admin/status-badge";
import { dayNumber, groupByDay, WEEKDAY_SHORT } from "@/lib/agenda-day";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { dayRange, isSameMonth, todayKey } from "@/lib/dates";
import { formatCurrency, formatInTz, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Vista mes en mobile (design/admin-iphone n-AgendaMes): tocar una celda
 * cambia la lista de abajo con estado local, sin navegar — a diferencia del
 * escritorio, que sigue yendo a la vista dia. Por eso vive en su propio
 * archivo cliente: `agenda-views.tsx` renderiza `AppointmentCard`, que es un
 * Server Component, y no puede pasar a cliente entero por esta selección.
 */
export function MonthMobileView({
  days,
  monthKey,
  appointments,
  initialSelectedKey,
}: {
  days: string[];
  monthKey: string;
  appointments: AppointmentWithCustomer[];
  initialSelectedKey: string;
}) {
  const [selected, setSelected] = useState(initialSelectedKey);
  const grouped = groupByDay(appointments);
  const today = todayKey();
  const selectedAppointments = grouped.get(selected) ?? [];

  return (
    <div className="flex flex-col gap-3.5 md:hidden">
      <div className="bg-card rounded-md border border-[var(--hs-border-card)] p-2">
        <div className="grid grid-cols-7 gap-0.5 pb-1">
          {WEEKDAY_SHORT.map((label) => (
            <span
              key={label}
              className="text-muted-foreground text-center text-[10px] uppercase tracking-wide"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((dateKey) => {
            const inMonth = isSameMonth(dateKey, `${monthKey}-01`);
            const hasAppointments = (grouped.get(dateKey)?.length ?? 0) > 0;
            const isToday = dateKey === today;
            const isSelected = dateKey === selected;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelected(dateKey)}
                className={cn(
                  "flex h-11 flex-col items-center justify-center rounded-md",
                  isSelected && !isToday && "bg-[var(--hs-track)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-[26px] items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                    isToday
                      ? "bg-foreground text-background"
                      : !inMonth
                        ? "text-[var(--hs-mist)]"
                        : hasAppointments
                          ? "text-foreground"
                          : "text-muted-foreground font-normal",
                  )}
                >
                  {dayNumber(dateKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
          {formatInTz(dayRange(selected).start, "EEEE d")} · {selectedAppointments.length} turno
          {selectedAppointments.length === 1 ? "" : "s"}
        </h2>

        {selectedAppointments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin turnos.</p>
        ) : (
          <div className="bg-card overflow-hidden rounded-md border border-[var(--hs-border-card)]">
            {selectedAppointments.map((appointment, index) => (
              <div
                key={appointment.id}
                className={cn(
                  "flex items-center justify-between gap-2.5 px-3.5 py-2.5",
                  index < selectedAppointments.length - 1 && "border-b border-[var(--hs-divider)]",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium tabular-nums">
                    {formatTime(appointment.starts_at)} ·{" "}
                    {appointment.customer?.full_name ?? "Cliente eliminado"}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {appointment.service_name_at_booking} ·{" "}
                    {formatCurrency(appointment.price_at_booking)}
                  </p>
                </div>
                <AdminStatusBadge status={appointment.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
