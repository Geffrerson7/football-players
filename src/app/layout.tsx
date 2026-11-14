import type { Metadata } from "next";
import { Big_Shoulders, Hanken_Grotesk } from "next/font/google";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { obtenerSesion } from "@/lib/sesion";
import { Providers } from "./providers";
import "./globals.css";

const fuenteDisplay = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-display",
  display: "swap",
  // next/font no tiene métricas para calcular un fallback ajustado de esta fuente.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
});

const fuenteTexto = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Football Players",
    template: "%s · Football Players",
  },
  description: "Gestión de jugadores, equipos y partidos con una estética futbolística editorial.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Solo para la cabecera (nombre, rol, cierre de sesión). El acceso lo protege src/proxy.ts.
  const usuario = await obtenerSesion();

  return (
    // suppressHydrationWarning: next-themes añade la clase del tema a <html> antes de hidratar.
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fuenteDisplay.variable} ${fuenteTexto.variable}`}
    >
      <body className="min-h-dvh">
        <Providers>
          <Navbar usuario={usuario && { nombre: usuario.nombre, rol: usuario.rol }} />
          <main id="contenido">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
