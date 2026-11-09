/**
 * Crea un usuario administrador nuevo (Supabase Auth + fila en `admins`).
 *
 * Uso:  npm run admin:crear
 *
 * No toca a los admins existentes. La contraseña se pide oculta y dos veces, y
 * nunca se imprime ni se pasa como argumento: así no queda en el historial.
 * Aplica a la base de Supabase, que es la misma que usa la app publicada.
 */
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const MIN_PASSWORD_LENGTH = 8;
const CTRL_C = String.fromCharCode(3);
const BACKSPACE = String.fromCharCode(8);
const DELETE = String.fromCharCode(127);
const ESCAPE_SEQUENCE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[~A-Za-z]`, "g");

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
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    }),
  );
}

// Si el proceso termina con el modo crudo puesto, la terminal queda sin eco.
process.on("exit", () => {
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // La terminal ya no está disponible.
    }
  }
});

function readMasked(question) {
  const { stdin, stdout } = process;
  return new Promise((resolve) => {
    let value = "";
    stdout.write(question);

    function onData(chunk) {
      for (const char of chunk.replace(ESCAPE_SEQUENCE, "")) {
        if (char === "\r" || char === "\n") {
          stdin.removeListener("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === CTRL_C) {
          stdout.write("\nCancelado. No se creó nada.\n");
          process.exit(130);
        }
        if (char === DELETE || char === BACKSPACE) {
          if (value.length > 0) {
            value = [...value].slice(0, -1).join("");
            stdout.write(`${BACKSPACE} ${BACKSPACE}`);
          }
          continue;
        }
        if (char < " ") continue;
        value += char;
        stdout.write("•");
      }
    }

    stdin.on("data", onData);
  });
}

async function askPassword() {
  const { stdin } = process;
  if (!stdin.isTTY) fail("La contraseña se escribe en una terminal: ejecutá el comando directamente.");

  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();
  try {
    const first = await readMasked("Contraseña: ");
    if (first.length < MIN_PASSWORD_LENGTH) {
      fail(`La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres. No se creó nada.`);
    }
    const second = await readMasked("Repetila: ");
    if (first !== second) fail("Las contraseñas no coinciden. No se creó nada.");
    return first;
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
  }
}

async function main() {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));

  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
  const supabase = createClient(url, serviceKey, clientOptions);

  const email = (await ask("Email del nuevo admin: ")).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Ese email no parece válido. No se creó nada.");

  const password = await askPassword();

  // `email_confirm` lo marca como verificado: sin esto Supabase mandaría un mail
  // de confirmación que la app no sabe procesar.
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) fail(`Supabase rechazó la creación: ${error?.message ?? "sin detalle"}`);

  const { error: adminError } = await supabase.from("admins").insert({ user_id: data.user.id });
  if (adminError) {
    // Sin fila en admins la cuenta no sirve; se deshace para no dejar un usuario huérfano.
    await supabase.auth.admin.deleteUser(data.user.id);
    fail(`No se pudo habilitar como admin (${adminError.message}). Se deshizo la creación.`);
  }

  console.log(`\n✔ Admin creado: ${email}`);

  // Verificación real: mismo camino que usa /login.
  const client = createClient(url, anonKey, clientOptions);
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) fail(`El admin se creó, pero el ingreso de prueba falló: ${loginError.message}`);
  await client.auth.signOut({ scope: "local" });
  console.log("✔ Ingreso de prueba: OK. Ya podés entrar en /login.");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
