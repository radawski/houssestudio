/**
 * Genera los logos de los emails a partir de `public/logo.png`.
 *
 * Uso:  npm run email:logo
 *
 * El logo original es blanco sobre un fondo negro puro (RGB, sin canal alfa).
 * Acá el glifo pasa a blanco con la luminancia como opacidad (conserva el
 * antialias de los bordes) y se apoya sobre un cuadrado `#050505` con las
 * esquinas redondeadas: en modo claro se funde con el header, y en el modo
 * oscuro de Gmail (que invierte el header a blanco pero no las imágenes)
 * queda como un ícono negro, en vez de un logo blanco sobre blanco.
 *
 * Sale en el doble del tamaño con el que se dibuja (46×52 en el header del
 * cliente, 28×31 en el del panel), para que se vea nítido en pantallas retina.
 * Las medidas tienen que coincidir con `EMAIL_LOGOS` en `lib/email/layout.ts`.
 *
 * `sharp` no está en `package.json`: llega instalado como dependencia de Next
 * (lo usa para optimizar imágenes). Alcanza para un script que se corre a
 * mano; los PNG generados quedan commiteados y la app no lo importa.
 */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SOURCE = fileURLToPath(new URL("../public/logo.png", import.meta.url));
const OUT_DIR = fileURLToPath(new URL("../public/email/", import.meta.url));

const SIZES = [
  { file: "logo-92.png", width: 92, height: 104 },
  { file: "logo-56.png", width: 56, height: 62 },
];

/** Fondo del ícono: el mismo negro del header, así en modo claro no se nota. */
const TILE = "#050505";
/** Margen del glifo dentro del ícono y radio de las esquinas, en proporción. */
const PADDING = 0.14;
const RADIUS = 0.2;

async function whiteGlyph(width, height) {
  // Primero se achica en escala de grises (el promedio suaviza los bordes) y
  // recién después esa luminancia pasa a ser el alfa de un blanco puro.
  const { data, info } = await sharp(SOURCE)
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = data[i * info.channels];
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const { file, width, height } of SIZES) {
    // Ícono con fondo propio: Gmail en modo oscuro invierte el header negro a
    // blanco, y un glifo blanco suelto desaparecería. Las imágenes no se
    // invierten, así que el cuadrado negro lo mantiene visible en los dos modos.
    const padX = Math.round(width * PADDING);
    const padY = Math.round(height * PADDING);
    const radius = Math.round(Math.min(width, height) * RADIUS);
    const tile = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${TILE}"/></svg>`,
    );
    const glyph = await whiteGlyph(width - padX * 2, height - padY * 2);

    await sharp(tile)
      .composite([{ input: glyph, left: padX, top: padY }])
      .png({ compressionLevel: 9 })
      .toFile(`${OUT_DIR}${file}`);

    console.log(`public/email/${file}  ${width}×${height}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
