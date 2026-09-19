# Plan — Módulo 4: cierre-de-caja (Fase 2)

Fuente: `SPEC.md` sección 4.4. Depende del módulo 3 (`payments`,
`walk_in_sales`), ya completo. `revalidateAgenda()` ya incluye
`/admin/caja` desde el módulo 3.

## Dependencias

```
T1 motor puro: lib/cashbox.ts (summarizeCharges)
T2 lib/dates.ts: exactMonthRange (rango exacto del mes, sin relleno de grilla)
      │
      └─→ T3 lib/data/cashbox.ts: getCashboxSummary(range)
              │
              └─→ T4 UI: app/admin/caja + caja-toolbar.tsx
                      │
                      └─→ T5 admin-nav.tsx: link a Caja
```

## Decisión que no estaba explícita en SPEC.md §4.4

`monthRange` en `lib/dates.ts` devuelve la grilla completa del calendario
visual (con días de relleno del mes anterior/siguiente para completar
semanas), pensada para `MonthView` de la agenda. Usarla tal cual en el
reporte de caja incluiría días que no son del mes en el total mensual. Se
agrega `exactMonthRange`, el primer y último instante del mes calendario
real, sin relleno — nueva función, no una que ya exista y haya que tocar.

## Tareas

### T1 — Motor puro de agregación

**Archivo**: `lib/cashbox.ts` (+ test).

```ts
export type Charge = { amount: number; method: PaymentMethod };
export type CashboxBreakdown = { total: number; byMethod: Record<PaymentMethod, number> };
export function summarizeCharges(charges: Charge[]): CashboxBreakdown
```

Sin `server-only`, sin Supabase — mismo patrón que `lib/availability.ts` y
`lib/cancellation.ts`. Cubre: lista vacía, un solo medio, ambos medios
mezclados, montos con decimales.

**Verificación**: `npx vitest run lib/cashbox.test.ts` (RED antes de
implementar).

### T2 — `exactMonthRange` en `lib/dates.ts`

**Archivo**: `lib/dates.ts` (+ test nuevo `lib/dates.test.ts`, el archivo no
tiene tests todavía pese a tener lógica de bordes de fecha — se suma la
cobertura para esta función).

`exactMonthRange(dateKey)`: primer y último instante del mes calendario que
contiene `dateKey`, en hora local. Reusa `dayRange` para los dos extremos,
igual que `monthRange`, pero sin `startOfWeek`/`endOfWeek`.

**Verificación**: test de un mes que empieza o termina a mitad de semana,
para confirmar que no hay días de otro mes adentro del rango.

### T3 — Lectura combinada: `getCashboxSummary`

**Archivo**: `lib/data/cashbox.ts` (nuevo, `server-only`).

- Trae `payments` (con el turno embebido para `service_name_at_booking` y
  `status`) y `walk_in_sales` del rango en paralelo, por `paid_at` /
  `sold_at`.
- Filtra en memoria los pagos cuyo turno esté `cancelado` (hoy ningún flujo
  cancela un turno ya `completado`, pero es el criterio de aceptación de la
  spec y no cuesta nada respetarlo). Se filtra en JS y no con un filtro de
  PostgREST sobre la tabla embebida, para no depender de una sintaxis de
  query mas fragil para un volumen de filas que es chico de entrada.
- Devuelve `{ movements: CashboxMovement[], breakdown: CashboxBreakdown }`
  (usa `summarizeCharges` de T1), movimientos ordenados del más reciente al
  más viejo.

**Verificación**: `npm run typecheck`.

### T4 — Página `/admin/caja`

**Archivos**: `app/admin/caja/page.tsx`, `app/admin/caja/caja-toolbar.tsx`
(nuevo, mismo patrón de navegación día/semana/mes que
`agenda-toolbar.tsx`, sin el botón de venta suelta — ese ya vive en la
agenda).

- Resumen del período (total + desglose por medio de pago) y tabla de
  movimientos (fecha/hora, origen turno/venta suelta, servicio, medio,
  monto), usando `components/ui/table.tsx`.

**Verificación**: prueba manual en el checkpoint final.

### T5 — Link en la navegación

**Archivo**: `app/admin/admin-nav.tsx`: nuevo ítem "Caja" → `/admin/caja`.

## Checkpoints

- Después de T1 y T2: tests en verde antes de escribir la capa de datos.
- Después de T3: `npm run typecheck` en verde antes de tocar UI.
- Al final: `npm run typecheck && npm test && npm run build`, y prueba
  manual real: confirmar que el cobro y la venta suelta del módulo 3
  aparecen en la vista de día correspondiente, que semana/mes los siguen
  sumando, y que el desglose por medio de pago da el número correcto.
