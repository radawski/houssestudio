# Plan — Módulo 2: autogestion-cancelacion (Fase 2)

Fuente: `SPEC.md` sección 4.2. Depende del módulo 1 (emails), ya completo.
Revisado con `advisor` antes de escribir código — los ajustes de seguridad de
abajo (rate limit, ventana dentro del `UPDATE`, código de error propio) salen
de esa revisión, no estaban en la redacción original de la spec.

## Dependencias

```
T1 helper puro de ventana (lib/cancellation.ts)
   │
T2 acción cancelByToken (lib/actions/booking.ts) — depende de T1 y del
   módulo 1 (sendCancellationNotice)
   │
T3 UI en /turno/[token] — depende de T1 (gating) y T2 (la acción)
```

## Decisiones que no estaban explícitas en SPEC.md §4.2

- `cancelByToken` vive en `lib/actions/booking.ts` (superficie pública, sin
  sesión), pero necesita las mismas tres guardas que ya tiene `createBooking`
  en ese archivo:
  1. **Rate limit** por IP (`checkRateLimit`), porque un token es un secreto
     de 1 solo campo — sin límite, la acción es un oráculo para adivinar
     `manage_token_hash` a fuerza bruta.
  2. **El token nunca llega como id.** Se resuelve por `manage_token_hash`
     dentro del propio `UPDATE`, igual que hoy se resuelve en la lectura.
  3. **La ventana se aplica en el `UPDATE`, no en un chequeo previo.** Un
     `.gt("starts_at", deadline)` + `.in("status", [...])` en la misma
     sentencia es el equivalente de la restricción de exclusión que ya
     protege `createBooking`: sin esto hay una ventana entre leer y escribir
     en la que el plazo pudo vencer.
- `ActionState.code` suma `"fuera_de_ventana"` (nuevo) en vez de reutilizar
  `"fuera_de_area"` — son ramas distintas que casualmente terminan las dos en
  WhatsApp.
- `cancelByToken` devuelve `ActionState`, no lanza. Es superficie pública: el
  patrón correcto a imitar es `createBooking` (useActionState), no
  `CancelAppointmentButton` del panel (throw + toast), que es para sesión
  admin.
- La revalidación de rutas se extrae a `lib/cache.ts` (`revalidateAgenda()`)
  para que la use tanto `appointments.ts` como `booking.ts` sin exportarla
  como Server Action desde un archivo `"use server"`. La cancelación pública
  tiene que refrescar `/` (grilla pública) además de `/admin*`, cosa que la
  redacción original de la spec no mencionaba.

## Tareas

### T1 — Helper puro de ventana de cancelación

**Archivo**: `lib/cancellation.ts` (+ `lib/cancellation.test.ts`).

**Alcance**: sin `server-only`, sin Supabase — mismo patrón que
`lib/availability.ts`.

```ts
export function cancellationDeadline(startsAt: string | Date, windowHours: number): Date
export function canCancel(params: {
  status: AppointmentStatus;
  startsAt: string | Date;
  windowHours: number;
  now?: Date;
}): boolean
```

`canCancel` es falso para cualquier estado que no sea `pendiente` o
`confirmado`, y falso a partir del instante exacto del límite (no solo
después) — mismo borde estricto (`<`) que va a usar el `UPDATE` en SQL
(`>`), para que UI y base nunca discrepen en el segundo límite.

**Criterios de aceptación**: casos de borde cubiertos por test — justo antes
del límite, justo en el límite, justo después, y cada estado no cancelable.

**Verificación**: `npx vitest run lib/cancellation.test.ts` (RED antes de
implementar, GREEN después).

### T2 — Server Action `cancelByToken`

**Archivos**: `lib/actions/booking.ts`, `lib/cache.ts` (nuevo, extrae
`revalidateAgenda` de `lib/actions/appointments.ts`), `lib/validation/schemas.ts`
(`cancelByTokenSchema`), `lib/actions/result.ts` (suma el código
`"fuera_de_ventana"` al tipo `ActionState["code"]`).

**Alcance**:
- Firma `cancelByToken(_prev: ActionState, formData: FormData)` — `token` y
  `reason` (opcional) viajan en el `FormData`, nunca un id de turno.
- Rate limit `cancel-token:${ip}`, mismo límite que `booking:${ip}`.
- Lee `settings.cancellation_window_hours` con `getSettings()` (ya existe).
- Un solo `UPDATE` con `.eq("manage_token_hash", hash)`,
  `.in("status", ["pendiente", "confirmado"])`,
  `.gt("starts_at", cancellationDeadline)` y
  `.select("id, service_name_at_booking, starts_at, cancellation_reason, customer:customers(full_name, email)")`
  `.maybeSingle()` (no `.single()`: cero filas es un resultado válido, no un
  error).
- Si `data` es `null`, se vuelve a consultar el turno por token
  (`getAppointmentByToken`) solo para dar el mensaje correcto: turno
  inexistente, ya resuelto (no cancelable por estado), o vigente pero fuera
  de ventana (`code: "fuera_de_ventana"`, deriva a WhatsApp con
  `settings.phone`).
- Si `data` existe: `cancelled_by: "cliente"` ya quedó grabado por el
  `UPDATE`; se llama `revalidateAgenda()` (de `lib/cache.ts`, ahora incluye
  `/`) y `sendCancellationNotice({ ..., cancelledBy: "cliente" })` reusando
  el módulo 1 tal cual.

**Criterios de aceptación**:
- Dentro de la ventana: el turno pasa a `cancelado`, el slot vuelve a la
  grilla pública sin recargar manualmente (revalidación correcta), y los dos
  emails de cancelación salen con `cancelledBy: "cliente"`.
- Fuera de la ventana: no se modifica nada, se devuelve
  `code: "fuera_de_ventana"` con el mensaje de coordinar por WhatsApp.
- Un turno ya `completado`/`cancelado`/`no_show`: mensaje claro de que ya no
  se puede cancelar desde acá, sin tocar la base.
- Más de 10 intentos por minuto desde la misma IP: mensaje de límite, igual
  que en `createBooking`.

**Verificación**: `npm run typecheck`, y prueba manual real (siguiente
tarea trae la UI para poder probarlo).

### T3 — UI en `/turno/[token]`

**Archivos**: `app/turno/[token]/page.tsx`,
`components/public/cancel-appointment-button.tsx` (nuevo).

**Alcance**:
- La página server-side llama `getSettings()` además de
  `getAppointmentByToken`, y usa `canCancel` (T1) para decidir si renderiza
  el botón.
- Componente cliente con `useActionState(cancelByToken, idleState)`: diálogo
  de confirmación con motivo opcional (igual estética que
  `CancelAppointmentButton` del panel, pero atado a `useActionState` en vez
  de `useTransition` + throw), y si la respuesta trae
  `code === "fuera_de_ventana"`, muestra la salida a WhatsApp reusando el
  patrón visual de `OutOfAreaNotice` con `settings.phone`.

**Criterios de aceptación**:
- El botón no aparece en `completado`, `cancelado` ni `no_show`.
- Dentro de la ventana: cancelar refresca la página mostrando "Este turno fue
  cancelado" sin recarga manual.
- Fuera de la ventana (o turno ya resuelto entre que se abrió la página y se
  confirmó): se ve la salida a WhatsApp, no un cartel de error genérico.

**Verificación**: prueba manual real — reservar un turno con
`min_booking_lead_minutes` bajo o `cancellation_window_hours` alto para poder
probar ambas ramas (dentro y fuera de ventana) sin esperar horas reales, y
revisar `email_log` + las dos casillas después de cancelar dentro de la
ventana.

## Checkpoints

- Después de T1: tests en verde antes de tocar la Server Action.
- Después de T2: `npm run typecheck && npm test` en verde antes de tocar UI.
- Al final: `npm run typecheck && npm test && npm run build`, más la prueba
  manual de ambas ramas (dentro y fuera de ventana) en `npm run dev`.
