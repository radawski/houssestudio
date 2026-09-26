import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo afecta a `next dev`: sin esto, el servidor de desarrollo responde 403
  // a sus propios scripts cuando la página se abre desde la IP de la red local
  // (el celular de prueba), y la página queda sin hidratar.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
