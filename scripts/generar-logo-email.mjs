/**
 * Genera los logos de los emails a partir de `public/logo.png`.
 *
 * Uso:  npm run email:logo
 *
 * El logo original es blanco sobre un fondo negro puro (RGB, sin canal alfa).
 * En el header de los emails (`#050505`) ese negro dejaría un recuadro apenas
 * distinto, y algunos clientes con modo oscuro lo invierten. Acá el glifo pasa
 * a blanco sobre transparente: la luminancia de cada píxel se vuelve su
 * opacidad, así los bordes suavizados conservan el antialias.
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

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const { file, width, height } of SIZES) {
    // Primero se achica en escala de grises (el promedio suaviza los bordes)
    // y recién después esa luminancia pasa a ser el alfa de un blanco puro.
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

    await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(`${OUT_DIR}${file}`);

    console.log(`public/email/${file}  ${info.width}×${info.height}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
