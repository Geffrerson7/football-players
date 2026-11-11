// Utilidades puras de dominio: se usan tanto en el servidor como en el cliente.

export const POSICIONES = ["Portero", "Defensa", "Mediocampista", "Delantero"] as const;
export type Posicion = (typeof POSICIONES)[number];

export const DORSAL_MIN = 1;
export const DORSAL_MAX = 99;
export const FECHA_MINIMA = "1900-01-01";

/** Jugador serializable que viaja del servidor a los componentes cliente. */
export type JugadorDTO = {
  id: number;
  nombre: string;
  posicion: string | null;
  dorsal: number;
  activo: boolean;
  /** Fecha en formato ISO "YYYY-MM-DD" o null. */
  fechaNacimiento: string | null;
};

/** Convierte un DATE de Postgres (Prisma lo entrega como medianoche UTC) a "YYYY-MM-DD". */
export function fechaAISO(fecha: Date | null): string | null {
  return fecha ? fecha.toISOString().slice(0, 10) : null;
}

/** Fecha de hoy en formato "YYYY-MM-DD" según la zona horaria local. */
export function hoyISO(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function partesFecha(iso: string | null): [number, number, number] | null {
  if (!iso) return null;
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  return [anio, mes, dia];
}

/**
 * "2000-05-14" → "14 may 2000" (corto) o "14 de mayo de 2000" (largo).
 * Se formatea en UTC para que la zona horaria nunca desplace el día.
 */
export function formatearFecha(
  iso: string | null,
  formato: "corto" | "largo" = "corto",
  vacio = "—",
): string {
  const partes = partesFecha(iso);
  if (!partes) return vacio;
  const [anio, mes, dia] = partes;
  return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString("es-PE", {
    timeZone: "UTC",
    day: formato === "corto" ? "numeric" : "2-digit",
    month: formato === "corto" ? "short" : "long",
    year: "numeric",
  });
}

export function calcularEdad(iso: string | null, hoy = new Date()): number | null {
  const partes = partesFecha(iso);
  if (!partes) return null;
  const [anio, mes, dia] = partes;
  let edad = hoy.getFullYear() - anio;
  const aunNoCumple =
    hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia);
  if (aunNoCumple) edad -= 1;
  return edad >= 0 ? edad : null;
}

export function etiquetaEstado(activo: boolean): string {
  return activo ? "Activo" : "Inactivo";
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join("")
    .toUpperCase();
}
