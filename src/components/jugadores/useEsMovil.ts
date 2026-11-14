"use client";

import { useSyncExternalStore } from "react";

/** Mismo corte que el prefijo `sm:` de Tailwind (640 px). */
const CONSULTA = "(max-width: 639.98px)";

function suscribirse(alCambiar: () => void) {
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener("change", alCambiar);
  return () => consulta.removeEventListener("change", alCambiar);
}

/**
 * true en pantallas de menos de 640 px. En el servidor (y durante la hidratación)
 * devuelve false: el ancho real solo se conoce en el navegador.
 */
export function useEsMovil(): boolean {
  return useSyncExternalStore(
    suscribirse,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}
