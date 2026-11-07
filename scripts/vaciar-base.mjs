/**
 * Deja la base lista para la entrega: borra los datos de prueba.
 *
 * Uso:  npm run db:vaciar                         borra turnos, clientes y catálogo
 *       npm run db:vaciar -- --conservar-catalogo  conserva servicios y productos
 *       npm run db:vaciar -- --simular             respalda y cuenta, sin borrar
 *
 * Antes de tocar nada respalda TODAS las tablas en `respaldos/<fecha>/` (una
 * por archivo JSON) y verifica que cada archivo tenga las mismas filas que la
 * tabla; si el respaldo falla, no se borra nada. La carpeta está en
 * `.gitignore`: tiene DNI, teléfonos y emails de clientes.
 *
 * Nunca toca `admins`, `settings` ni el horario (`business_hours` y sus
 * bloques): la cuenta del panel se cambia con `npm run admin:credenciales`, y
 * la configuración y el horario los ajusta el dueño desde el panel.
 *
 * Va contra la base de `.env.local`, que es la misma que usa la app publicada.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PAGE = 1000;

/** Todas las tablas de `public`, para el respaldo. */
const ALL_TABLES = [
  "admins",
  "settings",
  "business_hours",
  "business_hour_ranges",
  "time_blocks",
  "services",
  "product_categories",
  "products",
  "customers",
  "appointments",
  "payments",
  "email_log",
  "walk_in_sales",
];

/**
 * Orden de borrado: primero lo que apunta a otras tablas. `appointments` va
 * antes que `customers` porque su FK es `on delete restrict`; `products` antes
 * que `product_categories` por lo mismo. `payments` y `email_log` caerían solos
 * en cascada desde `appointments`, pero se borran explícitos para que el
 * conteo final los muestre en 0.
 */
const OPERATIONAL = ["payments", "email_log", "appointments", "walk_in_sales", "time_blocks", "customers"];
const CATALOG = ["products", "product_categories", "services"];

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) fail(`Falta ${name} en .env.local.`);
  return value;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function count(supabase, table) {
  const { count: total, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) fail(`No se pudo contar ${table}: ${error.message}`);
  return total ?? 0;
}

async function readAll(supabase, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE - 1);
    if (error) fail(`No se pudo leer ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function backup(supabase) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(ROOT, "respaldos", stamp);
  fs.mkdirSync(dir, { recursive: true });

  for (const table of ALL_TABLES) {
    const rows = await readAll(supabase, table);
    const expected = await count(supabase, table);
    if (rows.length !== expected) {
      fail(`El respaldo de ${table} tiene ${rows.length} filas y la tabla ${expected}. No se borró nada.`);
    }
    fs.writeFileSync(path.join(dir, `${table}.json`), JSON.stringify(rows, null, 2));
  }
  return dir;
}

async function main() {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
  const args = new Set(process.argv.slice(2));
  const simulate = args.has("--simular");
  const keepCatalog = args.has("--conservar-catalogo");

  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabase = createClient(url, requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Base: ${new URL(url).host}`);
  console.log("\nRespaldando todas las tablas…");
  const dir = await backup(supabase);
  console.log(`✔ Respaldo completo en ${path.relative(ROOT, dir)}/`);

  const targets = keepCatalog ? OPERATIONAL : [...OPERATIONAL, ...CATALOG];
  const before = Object.fromEntries(await Promise.all(targets.map(async (t) => [t, await count(supabase, t)])));

  console.log("\nSe borraría:");
  for (const table of targets) console.log(`  ${table.padEnd(20)} ${before[table]} filas`);
  console.log("\nSe conserva: admins, settings, business_hours, business_hour_ranges");
  if (keepCatalog) console.log("             services, product_categories, products");

  if (simulate) {
    console.log("\n(--simular) No se borró nada.");
    return;
  }

  const answer = (await ask('\nEsto no se puede deshacer salvo desde el respaldo. Escribí VACIAR para seguir: ')).trim();
  if (answer !== "VACIAR") {
    console.log("Cancelado. No se borró nada.");
    return;
  }

  for (const table of targets) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) fail(`No se pudo vaciar ${table}: ${error.message}. El respaldo está en ${dir}.`);
  }

  const leftovers = [];
  for (const table of targets) {
    const total = await count(supabase, table);
    if (total > 0) leftovers.push(`${table} (${total})`);
  }
  if (leftovers.length > 0) fail(`Quedaron filas en: ${leftovers.join(", ")}.`);

  console.log("\n✔ Base vacía. Todas las tablas borradas quedaron en 0.");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
