/**
 * Revisa la base de PRUEBA después de una corrida, y opcionalmente la vacía.
 *
 *   node scripts/carga/verificar.mjs            # cuenta turnos y busca solapes
 *   node scripts/carga/verificar.mjs --vaciar   # además borra turnos, mails y clientes de prueba
 *
 * El control importante es el de solapes: si dos personas quedaran con el
 * mismo horario, la prueba de la estampida fallaría aunque nadie viera un 500.
 */
import { loadEnvs, testClient } from "./entorno.mjs";

const env = loadEnvs();
const db = testClient(env);

const { data: appts, error } = await db
  .from("appointments")
  .select("id, starts_at, ends_at, status, customer_id")
  .in("status", ["pendiente", "confirmado"])
  .order("starts_at");
if (error) throw new Error(error.message);

let overlaps = 0;
for (let i = 1; i < appts.length; i++) {
  if (new Date(appts[i].starts_at) < new Date(appts[i - 1].ends_at)) overlaps++;
}
const perCustomer = new Map();
for (const a of appts) perCustomer.set(a.customer_id, (perCustomer.get(a.customer_id) ?? 0) + 1);
const byDay = {};
for (const a of appts) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(a.starts_at),
  );
  byDay[day] = (byDay[day] ?? 0) + 1;
}

const { count: logErrors } = await db
  .from("email_log")
  .select("*", { count: "exact", head: true })
  .eq("status", "error");
const { count: logSent } = await db
  .from("email_log")
  .select("*", { count: "exact", head: true })
  .eq("status", "enviado");

console.log(`Turnos vivos: ${appts.length}  por día: ${JSON.stringify(byDay)}`);
console.log(`Solapes: ${overlaps}  clientes con más de un turno: ${[...perCustomer.values()].filter((n) => n > 1).length}`);
console.log(`email_log: ${logSent} enviados, ${logErrors} con error (con Resend apagado tienen que ser 0 enviados)`);

if (process.argv.includes("--vaciar")) {
  for (const [table, column] of [
    ["email_log", "id"],
    ["payments", "id"],
    ["appointments", "id"],
    ["customers", "id"],
  ]) {
    const { error: e } = await db.from(table).delete().not(column, "is", null);
    if (e) throw new Error(`Vaciando ${table}: ${e.message}`);
  }
  console.log("Base de prueba vaciada (turnos, pagos, mails y clientes).");
}
