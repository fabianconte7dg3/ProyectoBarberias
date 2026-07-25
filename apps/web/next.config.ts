import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
