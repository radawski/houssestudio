/**
 * Teléfonos argentinos: normalización y alcance del área de atención.
 *
 * Todo vive en una sola función porque quitar el prefijo `15` y reconocer la
 * característica son el MISMO problema, no dos pasos encadenados: el `15` va
 * después del código de área (`0342 15 533-1802`), y como la característica
 * puede tener 2, 3 o 4 dígitos, no se sabe dónde empieza el `15` hasta haberla
 * identificado. Resolverlos por separado deja números de 12 dígitos con el
 * `15` incrustado en el medio, que son imposibles de discar.
 */

/**
 * Características dentro del radio de atención (~185 km), definidas por el
 * dueño del local.
 *
 * El recorte es por distancia y no por provincia: incluye Paraná (343), que
 * está a 25 km cruzando el túnel pero es Entre Ríos, y deja afuera el norte
 * santafesino, que está a más de 300 km.
 */
export const LOCAL_AREA_CODES = [
  // Cuatro dígitos
  "3401", // San Jorge / El Trébol
  "3404", // San Carlos Centro / Gálvez
  "3405", // Helvecia
  "3406", // San Martín de las Escobas
  "3408", // San Cristóbal
  "3409", // Moisés Ville
  "3466", // Barrancas
  "3476", // San Lorenzo / Capitán Bermúdez
  "3492", // Rafaela
  "3493", // Sunchales
  "3496", // Esperanza
  "3497", // Llambi Campbell
  "3498", // San Justo
  // Tres dígitos
  "341", // Gran Rosario
  "342", // Gran Santa Fe / Santo Tomé
  "343", // Paraná
] as const;

/**
 * De mayor a menor longitud: si se probara al revés, un número de Rafaela
 * (3492) podría quedar atrapado por una característica de tres dígitos y el
 * resto del número quedaría corrido.
 */
const CODES_BY_LENGTH = [...LOCAL_AREA_CODES].sort((a, b) => b.length - a.length);

/** Largo de un número argentino sin prefijos: característica + abonado. */
const NATIONAL_LENGTH = 10;

/** El mismo número con el `15` viejo todavía puesto. */
const LEGACY_LENGTH = NATIONAL_LENGTH + 2;

export type PhoneCheck =
  /** Cae dentro del área de atención. `national` son los 10 dígitos limpios. */
  | { kind: "local"; areaCode: string; national: string }
  /** Parece un número argentino válido, pero de otra zona. */
  | { kind: "out_of_area"; national: string }
  /** No llega a ser un número argentino: faltan o sobran dígitos. */
  | { kind: "invalid" };

/**
 * Saca los prefijos que no forman parte del número en sí.
 *
 * Deja `<característica><[15]><abonado>`, que es lo que sabe interpretar el
 * resto del módulo.
 */
function stripDialingPrefixes(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2); // salida internacional
  if (digits.startsWith("54")) digits = digits.slice(2); // país
  if (digits.startsWith("9")) digits = digits.slice(1); // marca de celular
  if (digits.startsWith("0")) digits = digits.slice(1); // acceso interurbano
  return digits;
}

/**
 * Clasifica un teléfono contra el área de atención.
 *
 * Distingue "de otra zona" de "mal escrito" a propósito: son dos caminos
 * distintos en la reserva. El primero manda a coordinar por WhatsApp; el
 * segundo es un error de tipeo que el cliente tiene que corregir.
 */
export function checkPhone(input: string): PhoneCheck {
  const digits = stripDialingPrefixes(input);

  for (const areaCode of CODES_BY_LENGTH) {
    if (!digits.startsWith(areaCode)) continue;

    let subscriber = digits.slice(areaCode.length);

    // Recién ahora se sabe dónde termina la característica, así que recién
    // ahora se puede distinguir un `15` de dos dígitos del abonado.
    if (digits.length === LEGACY_LENGTH && subscriber.startsWith("15")) {
      subscriber = subscriber.slice(2);
    }

    // Si no cierra en diez dígitos, esta característica no era: puede ser el
    // arranque casual de otra más larga.
    if (areaCode.length + subscriber.length !== NATIONAL_LENGTH) continue;

    return { kind: "local", areaCode, national: areaCode + subscriber };
  }

  if (digits.length === NATIONAL_LENGTH) {
    return { kind: "out_of_area", national: digits };
  }

  // Un `15` de otra zona: la característica desconocida puede tener 2, 3 o 4
  // dígitos, así que se prueban las tres posiciones posibles.
  if (digits.length === LEGACY_LENGTH) {
    for (const areaLength of [2, 3, 4]) {
      if (digits.slice(areaLength, areaLength + 2) === "15") {
        return {
          kind: "out_of_area",
          national: digits.slice(0, areaLength) + digits.slice(areaLength + 2),
        };
      }
    }
  }

  return { kind: "invalid" };
}

/**
 * Número listo para almacenar: diez dígitos, sin prefijos ni `15`.
 *
 * Ante algo que no se puede interpretar devuelve los dígitos tal cual, para no
 * perder lo que escribió el cliente; de rechazarlo se encarga la validación.
 */
export function normalizePhone(input: string): string {
  const result = checkPhone(input);
  return result.kind === "invalid" ? input.replace(/\D/g, "") : result.national;
}

export function isLocalPhone(input: string): boolean {
  return checkPhone(input).kind === "local";
}

/**
 * Formato que espera `wa.me`: código de país, marca de celular y número, sin
 * el `+` ni separadores.
 */
export function toWhatsappNumber(input: string): string | null {
  const result = checkPhone(input);
  if (result.kind === "invalid") return null;
  return `549${result.national}`;
}
