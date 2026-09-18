# Plan — Módulo 3: registro-de-cobros (Fase 2)

Fuente: `SPEC.md` sección 4.3. Depende de nada nuevo (los módulos 1 y 2 ya
están completos). Revisado con `advisor` antes de escribir código.

## Dependencias

```
T1 esquema (migración 0007 + tipos)
   │
   ├─→ T2 regla pura: canMarkNoShow
   │      │
   │      └─→ T3 acciones de turno: completeAppointment (RPC) + markNoShow
   │
   └─→ T4 ventas sueltas: walkInSaleSchema + recordWalkInSale + getActiveServices

T3 + T4 ─→ T5 UI de turno (appointment-actions.tsx + appointment-card.tsx)
T4      ─→ T6 UI de venta suelta (diálogo en la agenda)
```

## Ajustes de diseño que salieron de la revisión (no estaban en SPEC.md §4.3)

- **`completeAppointment` va por una función de Postgres (RPC), no por dos
  escrituras sueltas desde el cliente.** El criterio de aceptación de la spec
  ("no queda un estado intermedio 'completado sin pago'") es una garantía de
  atomicidad, y `supabase-js` no puede envolver dos `.update()`/`.insert()`
  sueltos en una sola transacción. La función
  `complete_appointment_with_payment(appointment_id, amount, method)` hace el
  `UPDATE` y el `INSERT` en la misma transacción, `security invoker` para
  que sigan mandando las políticas RLS de siempre (`requireAdmin()` +
  cliente de sesión, no `service_role`).
- **`/admin/caja` se suma a `revalidateAgenda()` en este módulo, no en el
  4.** Tanto `completeAppointment` como `recordWalkInSale` cambian lo que esa
  página (todavía no existe) va a mostrar; si se revalida recién en el
  módulo 4, ese módulo arranca con un reporte que no se actualiza al cobrar
  o registrar una venta suelta.
- **Las lecturas de servicios dentro de las acciones admin van por el
  cliente de sesión (`requireAdmin()`), no por `createAdminClient()`.**
  `getActiveService` en `lib/data/availability.ts` usa `service_role` porque
  sirve al portal público (sin sesión). Reusarla dentro de una acción admin
  rompería el patrón: todo lo que corre con sesión de barbero se apoya en
  RLS como segunda barrera. Se agrega `getActiveServices()` en
  `lib/data/appointments.ts` (el archivo de lecturas del panel) con
  `createClient()`.

## Tareas

### T1 — Esquema: `walk_in_sales` + función de cobro atómico

**Archivo**: `supabase/migrations/0007_ventas_sueltas.sql` +
`lib/supabase/database.types.ts`.

**Alcance**:
- Tabla `walk_in_sales` tal como la describe SPEC.md §3 (`service_id`,
  `service_name`, `amount`, `method`, `sold_at`, `note`), índice por
  `sold_at`, RLS con el mismo patrón `_admin_all` del resto de las tablas.
- Función `complete_appointment_with_payment(p_appointment_id, p_amount,
  p_method)`: `UPDATE appointments` (solo desde `confirmado`) + `INSERT
  payments` en una transacción; `raise exception` si el turno ya no está en
  `confirmado` (cero filas afectadas).
- `database.types.ts`: tipo `WalkInSale`, entrada en `Database.Tables`, y la
  función nueva en `Database.Functions` (junto a `is_admin`).

**Verificación**: `npm run typecheck` (el tipo de la función es lo que
avisa si algo quedó mal declarado).

### T2 — Regla pura: `canMarkNoShow`

**Archivo**: `lib/appointment-rules.ts` (+ test).

```ts
export function canMarkNoShow(params: {
  status: AppointmentStatus;
  startsAt: string | Date;
  now?: Date;
}): boolean
```

Solo `confirmado` y con `starts_at` ya pasado. Mismo patrón que
`lib/cancellation.ts`: función pura, sin `server-only`, testeada en los
bordes (justo antes/después del inicio del turno, cada estado no válido).

**Verificación**: `npx vitest run lib/appointment-rules.test.ts` (RED antes
de implementar).

### T3 — Acciones de turno: cobrar y marcar ausente

**Archivo**: `lib/actions/appointments.ts`.

- `completeAppointment(id, payment: { amount: number; method: PaymentMethod
  })`: valida con `paymentSchema` (`{appointmentId: id, ...payment}`), llama
  `supabase.rpc("complete_appointment_with_payment", ...)`, revalida agenda
  (incluye `/admin/caja` desde ya) y dispara nada de email (no está en
  alcance de este módulo).
- `markNoShow(id)`: `UPDATE` a `no_show` con `.eq("status", "confirmado")`;
  usa `canMarkNoShow` solo del lado del cliente para decidir si se muestra
  el botón, la base es la que manda vía el `.eq`.

**Verificación**: `npm run typecheck` (la UI todavía no existe, se prueba
manual recién en el checkpoint final).

### T4 — Ventas sueltas

**Archivos**: `lib/validation/schemas.ts` (`walkInSaleSchema`),
`lib/actions/sales.ts` (nuevo, `recordWalkInSale`), `lib/data/appointments.ts`
(`getActiveServices`).

- `walkInSaleSchema`: `serviceId` (uuid), `amount` (editable, sugerido desde
  el servicio), `method`, `note` opcional.
- `recordWalkInSale`: busca el servicio con el cliente de sesión, congela
  `service_name` al momento de la venta (mismo criterio que
  `service_name_at_booking`), inserta en `walk_in_sales`.
- `getActiveServices()`: `id, name, price` de servicios activos, para el
  selector del diálogo.

**Verificación**: `npm run typecheck`.

### T5 — UI: cobrar y marcar ausente desde la ficha del turno

**Archivos**: `components/admin/appointment-actions.tsx`,
`components/admin/appointment-card.tsx`.

- `CompleteAppointmentButton`: diálogo con monto (sugerido =
  `price_at_booking`, editable) y selector de medio de pago. Mismo patrón de
  diálogo que `CancelAppointmentButton`.
- `MarkNoShowButton`: sin diálogo, mismo patrón directo que
  `ConfirmAppointmentButton`.
- `AppointmentCard` separa las acciones por estado: `pendiente` → Aceptar /
  Rechazar (como hoy); `confirmado` → Marcar cobrado / Marcar ausente (solo
  si `canMarkNoShow`) / Cancelar.

**Verificación**: prueba manual en el checkpoint final.

### T6 — UI: venta suelta desde la agenda

**Archivos**: `app/admin/agenda/agenda-toolbar.tsx` (o un componente nuevo
que se monte ahí), `app/admin/agenda/page.tsx` (pasa `services` desde
`getActiveServices()`).

- Botón "Venta suelta" en la barra de la agenda (visible en las tres
  vistas), abre un diálogo con selector de servicio (autocompleta monto
  sugerido), monto editable, medio de pago y nota opcional.

**Verificación**: prueba manual en el checkpoint final.

## Checkpoints

- Después de T1: `npm run typecheck` en verde antes de escribir ninguna
  acción que dependa de los tipos nuevos.
- Después de T2: tests en verde antes de usar la regla en T3/T5.
- Después de T3+T4: `npm run typecheck && npm test` en verde antes de tocar
  UI.
- Al final: `npm run typecheck && npm test && npm run build`, aplicar la
  migración contra Supabase real (se pregunta antes) y prueba manual: cobrar
  un turno confirmado, marcar ausente uno cuyo horario ya pasó, y registrar
  una venta suelta — revisar las filas resultantes en `payments` y
  `walk_in_sales`.
