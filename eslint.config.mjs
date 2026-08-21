import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Export del editor de diseño: trae su propio runtime empaquetado, que no
    // mantenemos nosotros. Se conserva como fuente de la portada, pero no tiene
    // sentido lintearlo.
    //
    // El patrón evita la "ó" a propósito: macOS guarda el nombre del directorio
    // en Unicode descompuesto y no coincide con la forma precompuesta que se
    // escribe acá.
    "HOUSSESTUDIO*/**",
  ]),
]);

export default eslintConfig;
