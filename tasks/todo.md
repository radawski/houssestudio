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

## Fase B — Hoy + Ficha del turno
- [x] `lib/appointment-timeline.ts`: historial puro, con tests
- [x] `lib/data/appointments.ts`: sumar el pago asociado al turno
- [x] `components/admin/appointment-sheet.tsx`: ficha (completado/cancelado/no_show)
- [x] `AppointmentCard` + `ConfirmedAppointmentActions`: ficha al tocar la
      tarjeta en completado/cancelado/no_show, pending compartido
      Cobrar/No vino, tel/mail, picker de medio de pago dibujado
- [x] `app/admin/page.tsx`: "Por responder" → "Pendientes"
- [x] **Verificación manual** — encontró y corrigió desborde horizontal
      (`grid gap-3` sin columnas explícitas en 4 listas)

## Fase C — Agenda mobile
- [x] `lib/availability.ts`: `computeFreeGaps` (huecos libres, sin trocear por
      duración ni filtrar por `now`), con tests
- [x] `lib/agenda-day.ts`: `buildAgendaDayRows` (intercala turnos + huecos),
      más `groupByDay`/`dayNumber`/`WEEKDAY_SHORT` (movidos acá para romper un
      ciclo de imports entre `agenda-views.tsx` y `month-mobile.tsx`)
- [x] `components/admin/status-badge.tsx`: `AdminStatusBadge` compartido
      (monocromo salvo pendiente en ámbar) — reemplaza el `SHEET_BADGE` local
      de la ficha, ahora también usado en las 3 vistas de Agenda
- [x] `lib/data/appointments.ts`: `getBusinessHoursForDay` + `getTimeBlocksForDay`
- [x] Vista día: lista mobile [hora · tarjeta/hueco] con ficha de solo lectura
      al tocar (sin botones, a diferencia de Hoy/Solicitudes); desktop
      intacto detrás de `hidden md:block`
- [x] Vista semana: lista vertical por día en mobile; grilla de 4 columnas
      original detrás de `hidden md:grid` (con el `grid-cols-1`/`sm:grid-cols-2`
      correcto — mismo bug de desborde de la Fase B que seguía latente acá)
- [x] Vista mes: `app/admin/agenda/month-mobile.tsx` (client, selección local
      de día) + calendario compacto; desktop intacto detrás de `hidden md:block`
- [x] `WalkInSaleButton`: segundo `DialogTrigger` como FAB fixed en mobile,
      mismo diálogo que el botón de escritorio
- [x] `AgendaToolbar`: tira de 7 días (solo vista día, mobile), segmentado
      Día/Semana/Mes a todo el ancho en mobile, `Hoy` reordenado con `order-last`
- [ ] **Verificación manual pendiente** (ver mensaje al usuario)

## Fases D–H (pendientes, ver tasks/plan.md)
- [ ] D — Caja mobile (resumen único, lista, barras semana, heatmap mes)
- [ ] E — Solicitudes mobile (chips, hoja de rechazo con motivos)
- [ ] F — Servicios mobile (FAB, switch en botón 48×44, `<select>` de duración,
      header "← + título" diferido de la Fase A)
- [ ] G — Disponibilidad mobile (hoja por día, copiar horario, barra de cambios,
      header "← + título" diferido de la Fase A)
- [ ] H — Estados transversales (loading.tsx, error.tsx, toast con reintento)
