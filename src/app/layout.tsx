import type { Metadata, Viewport } from "next";
import { Archivo, Geist } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";

// Geist: legible al sol y con cifras tabulares para los montos
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
// Archivo ancho para los montos grandes: numerales firmes, como en un billete
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Obra", template: "%s · Obra" },
  description: "Gastos de la construcción por etapa, caja chica y cuentas entre socios.",
  applicationName: "Obra",
  appleWebApp: { capable: true, title: "Obra", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#173a6e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CR" className={`${geist.variable} ${archivo.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
