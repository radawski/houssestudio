/**
 * Generador de carga para el flujo público de reserva.
 *
 *   node scripts/carga/carga.mjs <escenario> [--vus 50] [--duracion 60]
 *        [--base http://localhost:3000] [--misma-ip] [--dia yyyy-MM-dd]
 *
 * Escenarios:
 *   portada     GET / en bucle, sin pausa (techo de la página cacheada).
 *   lecturas    calendario del mes + horarios de un día, en bucle, sin pausa.
 *   dni         consulta de DNI en bucle, sin pausa.
 *   recorrido   el camino completo de un cliente con pausas de persona real:
 *               portada → calendario → 1 a 3 días → DNI → reservar (reintenta
 *               hasta 3 veces si le ganan el horario).
 *   estampida   todos arrancan en el mismo instante y se pelean por los
 *               horarios de UN día (el que el peluquero "acaba de habilitar").
 *
 * Solo debe correr contra `next start` apuntado a la base de PRUEBA (ver
 * README.md de esta carpeta). Cada usuario virtual manda su propio
 * `x-forwarded-for` salvo con `--misma-ip`, que simula a muchos clientes
 * detrás de la misma IP pública (CGNAT de las compañías de celular).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

// --- Argumentos ---------------------------------------------------------------

const [scenario, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i++) {
  const key = rest[i].replace(/^--/, "");
  const next = rest[i + 1];
  if (next === undefined || next.startsWith("--")) args[key] = true;
  else args[key] = rest[++i];
}
const VUS = Number(args.vus ?? 20);
const DURATION_S = Number(args.duracion ?? 60);
const BASE = String(args.base ?? "http://localhost:3000");
const SAME_IP = Boolean(args["misma-ip"]);
const TIMEOUT_MS = 30_000;
/** Para que los DNI de corridas distintas no choquen entre sí. */
const RUN_OFFSET = Number(args.lote ?? Math.floor(Math.random() * 900)) * 1000;

// --- IDs de las Server Actions de este build ---------------------------------

function loadActionIds() {
  const manifest = JSON.parse(
    readFileSync(resolve(ROOT, ".next/server/server-reference-manifest.json"), "utf8"),
  );
  const ids = {};
  for (const [id, entry] of Object.entries(manifest.node)) {
    const worker = entry.workers?.["app/page"];
    const name = worker?.exportedName ?? entry.exportedName;
    if (worker && name) ids[name] = id;
  }
  for (const name of ["fetchSlots", "fetchMonthAvailability", "lookupCustomerByDni", "createBooking"]) {
    if (!ids[name]) throw new Error(`No encontré la acción ${name} en el build. ¿Corriste next build?`);
  }
  return ids;
}
const ACTIONS = loadActionIds();

// --- Métricas -----------------------------------------------------------------

const stats = new Map(); // paso -> { lat: number[], outcomes: Map }

function record(step, ms, outcome) {
  let s = stats.get(step);
  if (!s) stats.set(step, (s = { lat: [], outcomes: new Map() }));
  s.lat.push(ms);
  s.outcomes.set(outcome, (s.outcomes.get(outcome) ?? 0) + 1);
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

// --- HTTP ---------------------------------------------------------------------

function ipFor(vu) {
  if (SAME_IP) return "181.0.0.1";
  return `10.${(vu >> 16) & 255}.${(vu >> 8) & 255}.${vu & 255}`;
}

async function timed(step, fn) {
  const t0 = performance.now();
  try {
    const result = await fn();
    record(step, performance.now() - t0, result.outcome);
    return result;
  } catch (error) {
    const outcome = error?.name === "TimeoutError" ? "timeout" : `falla_red:${error?.cause?.code ?? error?.name}`;
    record(step, performance.now() - t0, outcome);
    return { outcome };
  }
}

/** Llama a una Server Action como lo hace el navegador (fetch con `Next-Action`). */
async function callAction(vu, name, body, contentType) {
  const res = await fetch(`${BASE}/`, {
    method: "POST",
    headers: {
      Accept: "text/x-component",
      "Next-Action": ACTIONS[name],
      // Con FormData no se pone: fetch arma el multipart con su boundary.
      ...(contentType ? { "Content-Type": contentType } : {}),
      "x-forwarded-for": ipFor(vu),
    },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  return { res, text };
}

/** Saca el valor de retorno del stream RSC: la fila `1:` del payload. */
function actionValue(text) {
  const line = text.split("\n").find((l) => l.startsWith("1:"));
  if (!line) return undefined;
  try {
    return JSON.parse(line.slice(2));
  } catch {
    return undefined;
  }
}

function classify(res, text) {
  if (res.status >= 500) return `http_${res.status}`;
  if (res.headers.get("x-action-redirect")) return "reservado";
  if (text.includes("acaba de ser tomado")) return "tomado_en_carrera";
  if (text.includes("ya no está disponible")) return "ya_no_disponible";
  if (text.includes("Demasiados intentos")) return "limitado_por_ip";
  if (text.includes("fuera del área")) return "fuera_de_area";
  if (res.status >= 400) return `http_${res.status}`;
  return "ok";
}

async function getHome(vu) {
  return timed("GET /", async () => {
    const res = await fetch(`${BASE}/`, {
      headers: { "x-forwarded-for": ipFor(vu) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.arrayBuffer();
    return { outcome: res.ok ? "ok" : `http_${res.status}` };
  });
}

async function monthAvailability(vu, serviceId, monthKey) {
  return timed("calendario (mes)", async () => {
    const { res, text } = await callAction(
      vu,
      "fetchMonthAvailability",
      JSON.stringify([serviceId, monthKey]),
      "text/plain;charset=UTF-8",
    );
    const outcome = classify(res, text);
    return { outcome, value: actionValue(text) };
  });
}

async function slotsFor(vu, serviceId, dateKey) {
  return timed("horarios (día)", async () => {
    const { res, text } = await callAction(
      vu,
      "fetchSlots",
      JSON.stringify([serviceId, dateKey]),
      "text/plain;charset=UTF-8",
    );
    const value = actionValue(text);
    const outcome = classify(res, text);
    return { outcome, value: Array.isArray(value) ? value : [] };
  });
}

async function dniLookup(vu, dni) {
  return timed("consulta DNI", async () => {
    const { res, text } = await callAction(
      vu,
      "lookupCustomerByDni",
      JSON.stringify([dni]),
      "text/plain;charset=UTF-8",
    );
    return { outcome: classify(res, text) };
  });
}

/**
 * `createBooking` con `useActionState`: el navegador manda `[estadoPrevio,
 * FormData]` codificado como multipart, con los campos del form prefijados
 * por el id de la referencia.
 */
async function book(vu, { serviceId, startsAt, dni }) {
  return timed("reservar", async () => {
    const form = new FormData();
    form.append("_1_serviceId", serviceId);
    form.append("_1_startsAt", startsAt);
    form.append("_1_dni", dni);
    form.append("_1_fullName", `Prueba Carga ${dni}`);
    form.append("_1_phone", `3425${String(Number(dni) - 99_000_000).padStart(6, "0")}`);
    form.append("_1_email", `carga+${dni}@example.com`);
    form.append("_1_note", "LOADTEST");
    form.append("0", JSON.stringify([{ status: "idle" }, "$K1"]));
    const { res, text } = await callAction(vu, "createBooking", form, undefined);
    let outcome = classify(res, text);
    // Cualquier otra respuesta de la acción: se reporta con su mensaje, para
    // no esconder errores de la base detrás de un "ok".
    if (outcome === "ok") outcome = `otro:${actionValue(text)?.message ?? text.slice(0, 80)}`;
    return { outcome, text };
  });
}

// --- Datos del local (servicios y ventana) -------------------------------------

async function discover() {
  // Los servicios y la ventana van embebidos en el HTML del stepper. Más simple
  // que parsearlos: leerlos del JSON-LD no alcanza (no lleva los ids), así que
  // se buscan los uuid de servicio en el payload RSC de la portada.
  const html = await (await fetch(`${BASE}/`)).text();
  const ids = [...new Set(html.match(/\\?"id\\?":\\?"([0-9a-f-]{36})\\?"/g) ?? [])]
    .map((m) => m.match(/[0-9a-f-]{36}/)[0]);
  const horizon = Number(html.match(/\\?"horizonDays\\?":(\d+)/)?.[1] ?? 7);
  if (ids.length === 0) throw new Error("No encontré servicios en la portada.");
  return { serviceIds: ids, horizonDays: horizon };
}

function dateKeyPlus(days) {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const think = () => sleep(1000 + Math.random() * 2000);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

let dniCounter = 0;
const nextDni = () => String(99_000_000 + RUN_OFFSET + dniCounter++);

// --- Escenarios ---------------------------------------------------------------

async function loopUntil(deadline, fn) {
  while (performance.now() < deadline) await fn();
}

async function tryToBook(vu, serviceId, dateKey, { preferFirst = 0 } = {}) {
  const dni = nextDni();
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { outcome: slotsOutcome, value: slots = [] } = await slotsFor(vu, serviceId, dateKey);
    if (slotsOutcome !== "ok") {
      record("cliente (resultado final)", 0, `abandonó:horarios_${slotsOutcome}`);
      return;
    }
    if (slots.length === 0) {
      record("cliente (resultado final)", 0, "sin_horarios_libres");
      return;
    }
    const pool = preferFirst ? slots.slice(0, preferFirst) : slots;
    const slot = pick(pool);
    const { outcome } = await book(vu, { serviceId, startsAt: slot.startsAt, dni });
    if (outcome === "reservado") {
      record("cliente (resultado final)", 0, `reservó_en_intento_${attempt}`);
      return;
    }
    if (outcome !== "tomado_en_carrera" && outcome !== "ya_no_disponible") {
      record("cliente (resultado final)", 0, `abandonó:${outcome}`);
      return;
    }
  }
  record("cliente (resultado final)", 0, "se_rindió_tras_3_intentos");
}

const scenarios = {
  async portada(vu, deadline) {
    await loopUntil(deadline, () => getHome(vu));
  },

  async lecturas(vu, deadline, ctx) {
    await loopUntil(deadline, async () => {
      const serviceId = pick(ctx.serviceIds);
      await monthAvailability(vu, serviceId, dateKeyPlus(0).slice(0, 7));
      await slotsFor(vu, serviceId, dateKeyPlus(1 + Math.floor(Math.random() * ctx.horizonDays)));
    });
  },

  async dni(vu, deadline) {
    await loopUntil(deadline, () =>
      dniLookup(vu, String(99_000_000 + Math.floor(Math.random() * 999_999))),
    );
  },

  async recorrido(vu, deadline, ctx) {
    await loopUntil(deadline, async () => {
      const serviceId = pick(ctx.serviceIds);
      await getHome(vu);
      await think();
      await monthAvailability(vu, serviceId, dateKeyPlus(0).slice(0, 7));
      await think();
      const browsed = 1 + Math.floor(Math.random() * 3);
      let dateKey;
      for (let i = 0; i < browsed; i++) {
        dateKey = dateKeyPlus(1 + Math.floor(Math.random() * ctx.horizonDays));
        await slotsFor(vu, serviceId, dateKey);
        await think();
      }
      await dniLookup(vu, nextDni());
      await think();
      await tryToBook(vu, serviceId, dateKey);
      await think();
    });
  },

  async estampida(vu, _deadline, ctx) {
    // Barrera: todos esperan el mismo instante, como cuando el peluquero
    // habilita el día y la gente estaba esperando con la página abierta.
    await sleep(Math.max(0, ctx.startAt - Date.now()));
    // La mayoría quiere los primeros horarios del día.
    await tryToBook(vu, ctx.serviceIds[0], ctx.day, { preferFirst: 4 });
  },
};

// --- Main ---------------------------------------------------------------------

if (!scenarios[scenario]) {
  console.error(`Escenario desconocido: ${scenario}. Opciones: ${Object.keys(scenarios).join(", ")}`);
  process.exit(1);
}

const ctx = await discover();
ctx.day = String(args.dia ?? dateKeyPlus(ctx.horizonDays));
ctx.startAt = Date.now() + 1500;

console.log(
  `▶ ${scenario}: ${VUS} usuarios, ${scenario === "estampida" ? `día ${ctx.day}` : `${DURATION_S}s`}` +
    `${SAME_IP ? ", todos con la MISMA IP" : ""} contra ${BASE}`,
);

const t0 = performance.now();
const deadline = t0 + DURATION_S * 1000;
await Promise.all(Array.from({ length: VUS }, (_, vu) => scenarios[scenario](vu + 1, deadline, ctx)));
const elapsedS = (performance.now() - t0) / 1000;

// --- Reporte ------------------------------------------------------------------

const summary = { scenario, vus: VUS, sameIp: SAME_IP, elapsedS, day: ctx.day, steps: {} };
console.log(`\nDuración real: ${elapsedS.toFixed(1)}s\n`);
for (const [step, s] of stats) {
  const sorted = [...s.lat].sort((a, b) => a - b);
  const total = sorted.length;
  const outcomes = Object.fromEntries(s.outcomes);
  const isTally = step === "cliente (resultado final)";
  const row = isTally
    ? { total, outcomes }
    : {
        total,
        rps: +(total / elapsedS).toFixed(1),
        p50: Math.round(pct(sorted, 50)),
        p95: Math.round(pct(sorted, 95)),
        p99: Math.round(pct(sorted, 99)),
        max: Math.round(sorted[total - 1] ?? 0),
        outcomes,
      };
  summary.steps[step] = row;
  console.log(
    isTally
      ? `${step}: ${JSON.stringify(outcomes)}`
      : `${step.padEnd(18)} n=${String(total).padStart(5)}  ${String(row.rps).padStart(6)} req/s  ` +
          `p50 ${row.p50}ms  p95 ${row.p95}ms  p99 ${row.p99}ms  max ${row.max}ms  ${JSON.stringify(outcomes)}`,
  );
}

mkdirSync(resolve(ROOT, "scripts/carga/resultados"), { recursive: true });
const file = resolve(
  ROOT,
  `scripts/carga/resultados/${scenario}-${VUS}${SAME_IP ? "-mismaip" : ""}-${Date.now()}.json`,
);
writeFileSync(file, JSON.stringify(summary, null, 2));
console.log(`\nGuardado en ${file}`);
