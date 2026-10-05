import type { Metadata } from "next";
import { Roboto } from "next/font/google";

import { BUSINESS_NAME } from "@/lib/config";
import "./globals.css";

// Pocos pesos a propósito: el sistema es minimalista y la jerarquía la dan el
// tamaño y el espacio, no la variedad tipográfica. No hay fuente mono propia:
// `font-mono` se usa en una sola pantalla del panel y le alcanza la del
// sistema, en vez de precargar una fuente más en cada visita a la portada.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS_NAME} — Reserva tu turno`,
    template: `%s · ${BUSINESS_NAME}`,
  },
  description:
    "Reserva tu turno de peluqueria online, sin llamadas y sin sena previa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${roboto.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
