import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Fotos de recibos, PDFs y XML de Hacienda
    serverActions: { bodySizeLimit: "15mb" },
  },
};

export default nextConfig;
