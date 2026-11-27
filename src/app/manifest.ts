import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Obra",
    short_name: "Obra",
    description: "Gastos de la construcción por etapa, caja chica y cuentas entre socios.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f5f4",
    theme_color: "#173a6e",
    lang: "es-CR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
