# Todo — Módulo 3: registro-de-cobros

- [x] T1 — Esquema: migración 0007 (`walk_in_sales` +
      `complete_appointment_with_payment`) + `database.types.ts`
      (falta aplicarla contra Supabase real, en el checkpoint final)
- [ ] T2 — Regla pura: `canMarkNoShow` (con tests)
- [ ] T3 — Acciones de turno: `completeAppointment` (RPC) + `markNoShow`
- [ ] T4 — Ventas sueltas: `walkInSaleSchema` + `recordWalkInSale` +
      `getActiveServices`
- [ ] T5 — UI: cobrar / marcar ausente desde la ficha del turno
- [ ] T6 — UI: venta suelta desde la agenda
- [ ] Checkpoint final: typecheck + test + build, migración aplicada, prueba
      manual real (cobrar, marcar ausente, venta suelta)
