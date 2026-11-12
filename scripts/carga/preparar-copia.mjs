/**
 * Copia el catálogo de producción al proyecto de prueba de carga.
 *
 *   node scripts/carga/preparar-copia.mjs
 *
 * Copia solo lo que define la disponibilidad pública: ajustes, servicios,
 * horario semanal con sus bloques y bloqueos futuros. Nunca copia clientes ni
 * turnos (datos personales). De producción solo LEE.
 */
import { loadEnvs, prodClient, testClient } from "./entorno.mjs";

const env = loadEnvs();
const prod = prodClient(env);
const test = testClient(env);

async function read(table, build = (q) => q) {
  const { data, error } = await build(prod.from(table).select("*"));
  if (error) throw new Error(`Leyendo ${table} de producción: ${error.message}`);
  return data;
}

async function wipe(table, column) {
  const { error } = await test.from(table).delete().not(column, "is", null);
  if (error) throw new Error(`Vaciando ${table} en prueba: ${error.message}`);
}

async function write(table, rows, upsertOn) {
  if (rows.length === 0) return;
  const query = upsertOn
    ? test.from(table).upsert(rows, { onConflict: upsertOn })
    : test.from(table).insert(rows);
  const { error } = await query;
  if (error) throw new Error(`Escribiendo ${table} en prueba: ${error.message}`);
}

const [settings, services, hours, ranges, blocks] = await Promise.all([
  read("settings"),
  read("services"),
  read("business_hours"),
  read("business_hour_ranges"),
  read("time_blocks", (q) => q.gt("ends_at", new Date().toISOString())),
]);

// Orden: primero lo que depende de otra tabla.
await wipe("business_hour_ranges", "weekday");
await wipe("time_blocks", "id");
// Los servicios del seed no tienen turnos en la base de prueba recién creada.
await wipe("services", "id");

await write("settings", settings, "id");
await write("services", services);
await write("business_hours", hours, "weekday");
await write("business_hour_ranges", ranges);
await write("time_blocks", blocks);

console.log("Catálogo copiado a la base de prueba:");
console.log(`  servicios activos: ${services.filter((s) => s.is_active).length}`);
console.log(`  días con horario: ${hours.filter((h) => !h.is_closed).length}, bloques: ${ranges.length}`);
console.log(`  bloqueos futuros: ${blocks.length}`);
const s = settings[0];
console.log(`  ventana: ${s.max_booking_days} días, anticipación mínima ${s.min_booking_lead_minutes} min`);
