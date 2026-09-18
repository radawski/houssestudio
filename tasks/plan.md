# Plan — Horario partido (mejora de Fase 1, fuera de SPEC.md)

Confirmado con el usuario: máximo 2 tramos por día (mañana/tarde), no un
número arbitrario. No toca `SPEC.md` — es una mejora a la disponibilidad
semanal de Fase 1, no un módulo de Fase 2.

## Diseño

- **Base**: `business_hours` suma `opens_at_2`/`closes_at_2` (nullable,
  van de a par, el segundo tramo cierra después de abrir y empieza después
  de que cierra el primero). Un día sin horario partido tiene ambos en
  `null` — cero cambio de comportamiento para los datos existentes.
- **Motor** (`lib/availability.ts`): `DayHours` suma `secondRange?: {opensAt,
  closesAt} | null` en vez de reemplazar `opensAt`/`closesAt` por un arreglo
  de rangos. Con esto ningún test ni llamador existente cambia de forma — es
  un campo opcional más, no una reescritura del tipo. `computeSlots` arma la
  lista de rangos a partir de `opensAt`/`closesAt` + `secondRange` (si
  existe) y corre el mismo encadenado por cada uno, concatenando.
- **Datos** (`lib/data/availability.ts`): al construir `DayHours` desde la
  fila de `business_hours`, agrega `secondRange` solo si
  `opens_at_2`/`closes_at_2` no son `null`.
- **Validación** (`lib/validation/schemas.ts`): `businessHourSchema` suma
  `hasSecondRange` + `opensAt2`/`closesAt2` opcionales, con `refine` para la
  misma regla que la base (par completo, orden correcto, no solapa con el
  primer tramo).
- **Acción** (`lib/actions/availability.ts`): `saveBusinessHours` lee los
  campos nuevos del `FormData` y los manda al `upsert`.
- **Panel** (`business-hours-form.tsx`): switch "Horario partido" por día
  (visible solo si el día está abierto); al activarlo aparece un segundo par
  de inputs de hora.

## Tareas

1. **T1** — Migración `0006_horario_partido.sql` + actualizar
   `BusinessHour` en `database.types.ts`.
2. **T2** — Motor: `DayHours.secondRange` + `computeSlots` (TDD: tests de
   horario partido en `lib/availability.test.ts` antes de tocar la función).
3. **T3** — Capa de datos: mapear `opens_at_2`/`closes_at_2` a
   `secondRange` en `getAvailableSlots` y `getMonthSlotCounts`.
4. **T4** — Validación + acción: `businessHourSchema` y `saveBusinessHours`.
5. **T5** — Panel: switch de horario partido en `business-hours-form.tsx`.
6. **Checkpoint final**: `npm run typecheck && npm test && npm run build`,
   aplicar la migración contra Supabase real (se pregunta antes, no es un
   entorno descartable) y prueba manual: cargar un día con horario partido
   y confirmar que la grilla pública encadena por separado en cada tramo.
