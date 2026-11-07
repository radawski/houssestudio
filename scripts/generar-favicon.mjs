/**
 * Genera los íconos del sitio a partir de `public/logo.png`.
 *
 * Uso:  npm run favicon
 *
 * Cuadrado negro lleno con el logo en blanco, lo más grande posible: el logo
 * tiene mucho detalle y en una pestaña (16 px) cada píxel cuenta. Como es más
 * alto que ancho, el que manda es el alto.
 *
 * Centrado óptico: el logo pesa más arriba y un poco a la izquierda (su centro
 * de masa cae cerca del 48% del ancho y del 42% del alto), así que centrado por
 * su recuadro se ve subido. Se lo corre hacia abajo y a la derecha una parte de
 * esa diferencia (`OPTICAL_CORRECTION`): llevar el centro de masa justo al
 * medio lo pasaría de largo y se vería caído. Para que el corrimiento hacia
 * abajo no lo haga tocar el borde, el logo se achica lo justo.
 *
 * Cada ícono se dibuja primero a 1024 px, con las posiciones exactas, y después
 * se reduce: a 16 px un redondeo a píxel entero movería el logo casi un 7%.
 *
 * Archivos generados (Next los toma solos por convención de nombre, ver
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`):
 * - `app/favicon.ico`: 16, 32 y 48 px, PNG dentro del ICO.
 * - `app/icon.png`: 512 px, para navegadores que piden un PNG grande.
 * - `app/apple-icon.png`: 180 px. Lleva más margen porque iOS le redondea las
 *   esquinas y le comería la punta de arriba a la izquierda del logo.
 *
 * `sharp` llega instalado como dependencia de Next, igual que en
 * `generar-logo-email.mjs`.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SOURCE = fileURLToPath(new URL("../public/logo.png", import.meta.url));
const APP_DIR = fileURLToPath(new URL("../app/", import.meta.url));

const BACKGROUND = "#000000";

/** Margen por lado, en proporción al lado del ícono. */
const PADDING = 0.04;
const APPLE_PADDING = 0.12;

/** Qué parte de la distancia entre centro de masa y centro geométrico se corrige. */
const OPTICAL_CORRECTION = 0.6;

/** Lado del dibujo de trabajo, antes de reducirlo al tamaño final. */
const MASTER = 1024;

/** El logo sin el negro sobrante, y dónde cae su centro de masa (0 a 1). */
async function loadLogo() {
  const buffer = await sharp(SOURCE).trim({ background: "#000", threshold: 10 }).png().toBuffer();
  const { data, info } = await sharp(buffer).grayscale().raw().toBuffer({ resolveWithObject: true });

  let mass = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const value = data[(y * info.width + x) * info.channels];
      mass += value;
      sumX += value * x;
      sumY += value * y;
    }
  }

  return {
    buffer,
    aspect: info.width / info.height,
    centerX: sumX / mass / info.width,
    centerY: sumY / mass / info.height,
  };
}

async function iconPng(logo, size, padding) {
  // Al menos un píxel de margen en el tamaño final.
  const margin = Math.max(padding, 1 / size) * MASTER;

  // Corrimiento, en proporción al alto/ancho del logo dibujado.
  const shiftY = OPTICAL_CORRECTION * (0.5 - logo.centerY);
  const shiftX = OPTICAL_CORRECTION * (0.5 - logo.centerX);

  // Corrido hacia abajo, el logo tiene que seguir entrando entre los márgenes.
  const height = (MASTER - margin * 2) / (1 + 2 * Math.abs(shiftY));
  const width = height * logo.aspect;

  const glyph = await sharp(logo.buffer)
    .resize(Math.round(width), Math.round(height), { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer();

  const left = Math.round((MASTER - width) / 2 + shiftX * width);
  const top = Math.round((MASTER - height) / 2 + shiftY * height);

  const master = await sharp({
    create: { width: MASTER, height: MASTER, channels: 3, background: BACKGROUND },
  })
    .composite([{ input: glyph, left, top }])
    .png()
    .toBuffer();

  return sharp(master)
    .resize(size, size, { kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** ICO con PNGs adentro (lo soportan todos los navegadores actuales). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

async function main() {
  const logo = await loadLogo();
  console.log(
    `centro de masa del logo: ${(logo.centerX * 100).toFixed(1)}% ancho, ${(logo.centerY * 100).toFixed(1)}% alto`,
  );

  const icoImages = [];
  for (const size of [16, 32, 48]) {
    icoImages.push({ size, png: await iconPng(logo, size, PADDING) });
  }
  await writeFile(`${APP_DIR}favicon.ico`, ico(icoImages));
  console.log("app/favicon.ico  16, 32, 48");

  await writeFile(`${APP_DIR}icon.png`, await iconPng(logo, 512, PADDING));
  console.log("app/icon.png  512×512");

  await writeFile(`${APP_DIR}apple-icon.png`, await iconPng(logo, 180, APPLE_PADDING));
  console.log("app/apple-icon.png  180×180");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
