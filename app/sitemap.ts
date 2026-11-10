import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/config";

/**
 * La portada es la única página pensada para llegar desde un buscador. "Mis
 * turnos" es una herramienta para quien ya reservó; no se excluye, pero
 * tampoco se promociona.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl()}/`, changeFrequency: "weekly", priority: 1 }];
}
