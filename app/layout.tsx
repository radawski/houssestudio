import type { Metadata } from "next";
import { Roboto } from "next/font/google";

import { BUSINESS_ADDRESS, BUSINESS_NAME, siteUrl } from "@/lib/config";
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

const DEFAULT_TITLE = `${BUSINESS_NAME} — Barbería en ${BUSINESS_ADDRESS.locality} · Reservá tu turno online`;
const DESCRIPTION = `Barbería en ${BUSINESS_ADDRESS.street}, ${BUSINESS_ADDRESS.locality}, ${BUSINESS_ADDRESS.region}. Reservá tu turno online, sin llamadas y sin seña previa.`;

export const metadata: Metadata = {
  // Base para las URLs absolutas que piden `og:image`, `og:url` y el canonical.
  metadataBase: new URL(siteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${BUSINESS_NAME}`,
  },
  description: DESCRIPTION,
  // Es lo que muestran WhatsApp e Instagram al pegar el link. La imagen la pone
  // `app/opengraph-image.png`; acá van solo los textos.
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: BUSINESS_NAME,
    title: DEFAULT_TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning`: el script de abajo agrega `data-standalone`
    // a <html> antes de hidratar, y React no tiene que quejarse por eso.
    <html
      lang="es"
      className={`${roboto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Marca la app abierta desde la pantalla de inicio de iOS antes de
            pintar (sin parpadeo). iOS informa `display-mode: browser` si el
            sitio no tiene manifest; `navigator.standalone` sí es fiable. Lo
            usa la variante `standalone:` de globals.css. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(navigator.standalone||matchMedia('(display-mode: standalone)').matches)document.documentElement.setAttribute('data-standalone','')}catch(e){}",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
