# Todo — Módulo 3: registro-de-cobros

- [x] T1 — Esquema: migración 0007 (`walk_in_sales` +
      `complete_appointment_with_payment`) + `database.types.ts`
      (falta aplicarla contra Supabase real, en el checkpoint final)
- [x] T2 — Regla pura: `canMarkNoShow` (con tests)
- [x] T3 — Acciones de turno: `completeAppointment` (RPC) + `markNoShow`
- [x] T4 — Ventas sueltas: `walkInSaleSchema` + `recordWalkInSale` +
      `getActiveServices`
- [x] T5 — UI: cobrar / marcar ausente desde la ficha del turno
- [x] T6 — UI: venta suelta desde la agenda
- [x] Checkpoint final: typecheck + test + build, migración aplicada, prueba
      manual real (cobrar, marcar ausente, venta suelta) — las tres
      operaciones quedaron confirmadas en payments/appointments/walk_in_sales
