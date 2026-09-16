/**
 * Cambia el email y/o la contraseña con los que se entra al panel de admin.
 *
 * Uso:  npm run admin:credenciales
 *
 * Modifica el MISMO usuario de Supabase Auth en lugar de crear uno nuevo: al
 * conservar su id, la fila de la tabla `admins` sigue apuntándole y el acceso al
 * panel no se pierde en ningún momento.
 *
 * La contraseña se pide oculta y dos veces, y nunca se imprime ni se pasa como
 * argumento del comando: así no queda en el historial de la terminal. El cambio
 * aplica a la base de Supabase, que es la misma que usa la app publicada, así
 * que vale para local y producción a la vez.
 */
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const MIN_PASSWORD_LENGTH = 8;

const CTRL_C = String.fromCharCode(3);
const BACKSPACE = String.fromCharCode(8);
const DELETE = String.fromCharCode(127);

// Secuencias de escape (flechas, marcadores de pegado). En modo crudo llegan
// como caracteres sueltos y, si no se descartan, terminarían dentro de la clave.
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

/**
 * Deja la terminal utilizable pase lo que pase.
 *
 * Si el proceso termina con el modo crudo puesto (una validación que corta, un
 * Ctrl+C, un error), la terminal se queda sin eco y el usuario escribe a ciegas
 * hasta hacer `reset`.
 */
process.on("exit", () => {
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // La terminal ya no está disponible; no hay nada que restaurar.
    }
  }
});

/**
 * Lee una línea mostrando un punto por carácter.
 *
 * Da por sentado que el modo crudo ya está puesto: quien la llama es
 * `askPassword`, que lo sostiene durante todo el paso.
 */
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
          stdin.removeListener("data", onData);
          stdout.write("\n");
          console.log("Cancelado. No se cambió nada.");
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

/**
 * Pide la contraseña dos veces sin que se vea.
 *
 * Las dos lecturas ocurren dentro de una única sesión de modo crudo. Apagarlo
 * entre una y otra abre una ventana en la que la terminal vuelve a hacer eco: si
 * en ese instante hay tecleo adelantado o un pegado de varias líneas, la clave
 * aparece en pantalla en texto plano.
 *
 * Exige una terminal real. Aceptarla por una tubería invitaría a escribirla en
 * claro en el propio comando (`echo clave | ...`), que es lo que se busca evitar.
 */
async function askPassword() {
  const { stdin } = process;
  if (!stdin.isTTY) {
    fail("La contraseña se escribe en una terminal: ejecutá el comando directamente, sin pasarle datos.");
  }

  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();

  try {
    const first = await readMasked("Nueva contraseña: ");
    if (!first) return null;
    if (first.length < MIN_PASSWORD_LENGTH) {
      return { error: `La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres. No se cambió nada.` };
    }

    const second = await readMasked("Repetila: ");
    if (first !== second) return { error: "Las contraseñas no coinciden. No se cambió nada." };

    return { value: first };
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

  // Orden explícito: sin esto Postgres puede devolver las filas en cualquier
  // orden y el número que se elige en el menú apuntaría a otro usuario
  // entre una corrida y la siguiente.
  const { data: admins, error: adminsError } = await supabase
    .from("admins")
    .select("user_id")
    .order("created_at");
  if (adminsError) fail(`No se pudo leer la tabla admins: ${adminsError.message}`);
  if (admins.length === 0) fail("La tabla admins está vacía: no hay ningún administrador para modificar.");

  const accounts = [];
  for (const { user_id } of admins) {
    const { data, error } = await supabase.auth.admin.getUserById(user_id);
    if (error || !data.user) fail(`El admin ${user_id} no existe en Supabase Auth.`);
    accounts.push(data.user);
  }

  let account = accounts[0];
  if (accounts.length > 1) {
    console.log("\nAdministradores:");
    accounts.forEach((a, i) => console.log(`  ${i + 1}. ${a.email}`));
    const choice = Number((await ask("¿Cuál querés modificar? (número): ")).trim());
    account = accounts[choice - 1];
    if (!account) fail("Opción inválida. No se cambió nada.");
  }

  console.log(`\nAdministrador actual: ${account.email}`);
  console.log("Dejá un campo vacío y apretá Enter para conservarlo.\n");

  const emailInput = (await ask("Nuevo email: ")).trim().toLowerCase();
  let newEmail = null;
  if (emailInput && emailInput !== account.email?.toLowerCase()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) fail("Ese email no parece válido. No se cambió nada.");
    newEmail = emailInput;
  }

  const passwordResult = await askPassword();
  if (passwordResult?.error) fail(passwordResult.error);
  const newPassword = passwordResult?.value ?? null;

  if (!newEmail && !newPassword) {
    console.log("\nNo indicaste cambios. Todo queda igual.");
    return;
  }

  console.log("\nVas a aplicar:");
  if (newEmail) console.log(`  • Email: ${account.email} → ${newEmail}`);
  if (newPassword) console.log("  • Contraseña: nueva");

  const confirmation = (await ask("\n¿Confirmás? (s/N): ")).trim().toLowerCase();
  if (!["s", "si", "sí"].includes(confirmation)) {
    console.log("Cancelado. No se cambió nada.");
    return;
  }

  // `email_confirm` marca el email como verificado: sin esto Supabase mandaría un
  // mail de confirmación con un link que la app no sabe procesar, y el cambio
  // quedaría a medias.
  const attributes = {};
  if (newEmail) Object.assign(attributes, { email: newEmail, email_confirm: true });
  if (newPassword) attributes.password = newPassword;

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(account.id, attributes);
  if (updateError) fail(`Supabase rechazó el cambio: ${updateError.message}`);

  const { data: stillAdmin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", account.id)
    .maybeSingle();
  if (!stillAdmin) fail("El usuario se actualizó pero ya no figura en admins. Revisá la tabla en Supabase.");

  console.log(`\n✔ Credenciales actualizadas. Email de acceso: ${updated.user.email}`);

  // Verificación real: se entra con la clave nueva por el mismo camino que usa
  // /login. `scope: "local"` cierra solo esta sesión de prueba y deja intactas
  // las que tengas abiertas en otros dispositivos.
  if (newPassword) {
    const client = createClient(url, anonKey, clientOptions);
    const { error: loginError } = await client.auth.signInWithPassword({
      email: updated.user.email,
      password: newPassword,
    });
    if (loginError) fail(`El cambio se guardó, pero el ingreso de prueba falló: ${loginError.message}`);
    await client.auth.signOut({ scope: "local" });
    console.log("✔ Ingreso de prueba con la nueva contraseña: OK");
  } else {
    console.log("  Probá entrar en /login con el email nuevo y tu contraseña de siempre.");
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
