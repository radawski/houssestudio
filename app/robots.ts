import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/config";

/**
 * Solo se bloquea lo que no tiene nada que leer para un buscador: el panel, la
 * API y las vistas de desarrollo. `/login`, `/turno/…` y `/baja/…` quedan
 * abiertos a propósito: llevan `noindex`, y un `disallow` impediría que el
 * crawler lo lea (una URL bloqueada puede indexarse igual, sin contenido, si
 * alguien la enlaza).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/dev/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
