import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { BUSINESS_NAME } from "@/lib/config";
import "./globals.css";

// Pocos pesos a propósito: el sistema es minimalista y la jerarquía la dan el
// tamaño y el espacio, no la variedad tipográfica.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${roboto.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
