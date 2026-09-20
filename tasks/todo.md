# Todo — Wireframes móviles del panel admin

## Fase A — Fundaciones compartidas
- [x] Token de blanco (`--hs-white`) + `--card`/`--popover` remapeados
- [x] Punto ámbar del badge pendiente (`amber-500` → `amber-700`)
- [x] `Button`: tamaños táctiles aditivos (`touch`, `touch-lg`, `touch-xl`, `icon-touch`)
- [x] `Dialog` → bottom sheet en mobile, centrado sin cambios en desktop
- [x] `Toaster`: bottom-center + offset 96 en `/admin`, público sin cambios
- [x] Tab bar inferior (`AdminTabBar`) + shell con scroll propio + `/admin/mas`
- [ ] **Verificación manual pendiente** (ver mensaje al usuario)
- [ ] Header "← + título" de Servicios/Disponibilidad en mobile — diferido a
      Fases F/G (es específico de esas pantallas)

## Fase B — Hoy + Ficha del turno (siguiente)
- [ ] `lib/data/appointments.ts`: sumar el pago asociado al turno completado
- [ ] `components/admin/appointment-sheet.tsx`: ficha (completado/cancelado)
- [ ] `AppointmentCard`: abrir ficha en completado/cancelado, pending state
      compartido entre Cobrar/No vino
- [ ] `app/admin/page.tsx`: medidas exactas del wireframe (n-Main)

## Fases C–H (pendientes, ver tasks/plan.md)
- [ ] C — Agenda mobile (tira de días, semana en lista, mes con selección local)
- [ ] D — Caja mobile (resumen único, lista, barras semana, heatmap mes)
- [ ] E — Solicitudes mobile (chips, hoja de rechazo con motivos)
- [ ] F — Servicios mobile (FAB, switch en botón 48×44, `<select>` de duración)
- [ ] G — Disponibilidad mobile (hoja por día, copiar horario, barra de cambios)
- [ ] H — Estados transversales (loading.tsx, error.tsx, toast con reintento)
