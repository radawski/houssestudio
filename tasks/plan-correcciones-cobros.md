# Plan: correcciones del peluquero (cobros, faltas, cancelaciones, ventas)

Aprobado el 2026-11-10. Antes de este plan no había vuelta atrás para un turno `completado`, `no_show` o `cancelado`, ni para una venta suelta.

## Estado

| Paso | Qué | Estado |
|---|---|---|
| C1 | Migración `0018_correcciones.sql` y tipos | Hecho. **Hay que aplicarla en Supabase antes del deploy** |
| C2 | Deshacer "No vino" y Restaurar turno | Hecho |
| C3 | Corregir cobro (monto, medio, día) y Deshacer cobro | Hecho |
| C4 | Venta suelta: cambiar medio, anular, anular y volver a cargar | Hecho |
| C5 | Documentación | Hecho |

## Errores cubiertos

| Error | Dónde se corrige | Cómo |
|---|---|---|
| Monto o medio de pago equivocado (incluido el dividido) | Ficha del turno → **Corregir cobro**, o tocar el movimiento en Caja (día) | `correctPayment` → `update_appointment_payment` |
| Cobró al día siguiente y la plata cayó en otro día | **Corregir cobro** → "Día del cobro" | Mismo día con la hora original (`correctedPaidAt`) |
| Cobró el turno equivocado o antes de tiempo | **Corregir cobro** → **Deshacer cobro** | `undo_appointment_payment`: borra el pago y el turno vuelve a confirmado |
| Marcó "No vino" y el cliente llegó tarde | Ficha del turno → **Deshacer "No vino"** | `undoNoShow` |
| Canceló o rechazó por error | Ficha del turno cancelado → **Restaurar turno** | `restoreAppointment`; ver las reglas abajo |
| Venta suelta mal cargada o duplicada | Caja (día) → tocar la venta | Cambiar medio de pago, **Anular venta** o **Anular y volver a cargar** |

## Decisiones

- **Corrección silenciosa.** Se reemplaza el dato sin marca de "corregido". El borrado de un pago o de una venta es definitivo.
- **Restaurar**:
  - Solo se pueden restaurar los turnos que canceló el peluquero (`cancelled_by = 'barbero'`). Una cancelación del cliente no se deshace.
  - El turno vuelve a `confirmado` si ya tenía `confirmed_at`. Si no, era una solicitud rechazada y vuelve a `pendiente`.
  - Al volver a confirmado, si el turno es futuro, se le reenvía al cliente el mail de turno confirmado.
- **Superposición.** Volver a `pendiente` o `confirmado` hace entrar el turno de nuevo en `appointments_no_overlap`. Si el horario ya está ocupado, la base devuelve 23P01 y se muestra "Ese horario ya lo ocupa otro turno".
- **Las correcciones devuelven `ActionState`** en vez de lanzar un error: en producción, Next oculta el mensaje de un error lanzado.
- **"Anular y volver a cargar"** usa `replace_walk_in_sale`: borra la venta y registra la nueva en una sola transacción. La venta nueva conserva el día y la hora de la anterior, toma los precios actuales del catálogo, y los ítems que ya no están en el catálogo no se pueden volver a cargar (la hoja avisa cuántos son).
- Las fechas futuras que cancela "Terminar" un turno fijo quedan como canceladas por el peluquero, así que también muestran **Restaurar**. Se aceptó así: restaurar una de esas fechas solo vuelve a agendar ese día.
- **Queda para otra fase:** reprogramar un turno o cambiarle el servicio.
- **V2 `no_show_at` (0015):** cuando se haga, `undoNoShow` también tiene que limpiar ese campo.
