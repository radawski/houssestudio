# Todo — Módulo 1: emails-transaccionales

- [x] T1 — Cliente de Resend y variables de entorno (`lib/email/env.ts`,
      `lib/email/resend.ts`, `ADMIN_EMAIL` en `.env.local.example`,
      `npm install resend`)
- [x] T2 — Confirmación al cliente (`sendBookingConfirmation`, hook en
      `createBooking`)
- [x] T3 — Aviso interno al barbero (`sendNewRequestAlert`, mismo hook)
- [x] T4 — Notificación de cancelación (`sendCancellationNotice`, hook en
      `cancelAppointment`)
- [x] Checkpoint final: `npm run typecheck && npm test && npm run build` +
      repaso manual (reserva + cancelación) en `npm run dev` — los tres
      mails llegaron y `email_log` quedó correcto
