/**
 * Lectura de credenciales para la prueba de carga.
 *
 * Producción (`.env.local`) solo se lee, y solo para copiar el catálogo. Todo
 * lo que escribe va al proyecto de PRUEBA (`.env.loadtest`), y se corta antes
 * de empezar si las dos URLs coinciden: es el único seguro contra apuntarle la
 * carga por error a la base que usa el peluquero.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(import.meta.dirname, "../..");

function parseEnv(file) {
  const out = {};
  for (const line of readFileSync(resolve(ROOT, file), "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

export function loadEnvs() {
  const prod = parseEnv(".env.local");
  const test = parseEnv(".env.loadtest");

  // El panel de Supabase muestra la URL de la Data API con `/rest/v1/` al
  // final; supabase-js quiere solo el origen del proyecto.
  const testUrl = test.LOADTEST_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const testAnon = test.LOADTEST_SUPABASE_ANON_KEY;
  const testService = test.LOADTEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!testUrl || !testAnon || !testService) {
    throw new Error("Completá las tres variables de .env.loadtest antes de seguir.");
  }
  if (testUrl.replace(/\/$/, "") === prod.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")) {
    throw new Error(".env.loadtest apunta a la base de PRODUCCIÓN. Corto acá.");
  }

  return {
    prodUrl: prod.NEXT_PUBLIC_SUPABASE_URL,
    prodServiceKey: prod.SUPABASE_SERVICE_ROLE_KEY,
    testUrl,
    testAnon,
    testService,
    manageTokenSecret: prod.MANAGE_TOKEN_SECRET,
  };
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export function prodClient(env) {
  return createClient(env.prodUrl, env.prodServiceKey, opts);
}

export function testClient(env) {
  return createClient(env.testUrl, env.testService, opts);
}
