import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Imagen de produccion minima (solo .next/standalone + .next/static + public),
  // requerido por apps/web/Dockerfile en vez de copiar node_modules completo.
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/:tenantSlug/admin/barberos",
        destination: "/:tenantSlug/admin/empleados",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
