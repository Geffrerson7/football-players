// Tipos y utilidades puras del torneo (equipos, partidos, goles y posiciones).
// Se usan tanto en el servidor como en las pruebas; las consultas están en torneo-consultas.ts.

export type Referencia = { id: number; nombre: string };

export type EquipoDTO = {
  id: number;
  nombre: string;
  confederacion: string;
  grupo: string;
  rankingFifa: number;
  clasificado: boolean;
  /** Jugadores registrados en la selección. */
  jugadores: number;
};

export type GolDTO = {
  id: number;
  /** Equipo al que sube el gol al marcador. */
  equipoId: number;
  minuto: number | null;
  esPenal: boolean;
  /** null = goleador no registrado. */
  jugador: Referencia | null;
};

export type PartidoDTO = {
  id: number;
  fase: string;
  /** Fecha y hora en formato ISO 8601 (UTC) o null. */
  fecha: string | null;
  jugado: boolean;
  local: Referencia;
  visitante: Referencia;
  /** Marcador calculado desde `goles` (vista `marcadores`). */
  golesLocal: number;
  golesVisitante: number;
  goles: GolDTO[];
};

export type PosicionDTO = {
  equipo: Referencia;
  grupo: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  puntos: number;
};

export type GoleadorDTO = {
  jugador: Referencia;
  equipo: Referencia | null;
  goles: number;
  penales: number;
};

export type Resultado = "victoria" | "empate" | "derrota";

/**
 * "2026-06-11T18:00:00.000Z" → "11 jun 2026 · 18:00 UTC".
 * Se formatea en UTC para que el servidor y el navegador muestren siempre lo mismo.
 */
export function formatearFechaPartido(iso: string | null, vacio = "Fecha por definir"): string {
  if (!iso) return vacio;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return vacio;
  const dia = fecha.toLocaleDateString("es-PE", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const hora = fecha.toLocaleTimeString("es-PE", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dia} · ${hora} UTC`;
}

/** Criterios de desempate: puntos, diferencia de goles, goles a favor y nombre. */
export function ordenarPosiciones(filas: PosicionDTO[]): PosicionDTO[] {
  return [...filas].sort(
    (a, b) =>
      b.puntos - a.puntos ||
      b.dg - a.dg ||
      b.gf - a.gf ||
      a.equipo.nombre.localeCompare(b.equipo.nombre, "es"),
  );
}

/** Agrupa conservando el orden de los elementos; las claves salen ordenadas alfabéticamente. */
export function agruparPor<T>(elementos: T[], clave: (elemento: T) => string): [string, T[]][] {
  const grupos = new Map<string, T[]>();
  for (const elemento of elementos) {
    const k = clave(elemento);
    grupos.set(k, [...(grupos.get(k) ?? []), elemento]);
  }
  return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
}

/** Resultado del partido para un equipo; null si no se ha jugado o el equipo no participa. */
export function resultadoPara(partido: PartidoDTO, equipoId: number): Resultado | null {
  if (!partido.jugado) return null;
  const esLocal = partido.local.id === equipoId;
  if (!esLocal && partido.visitante.id !== equipoId) return null;
  const propios = esLocal ? partido.golesLocal : partido.golesVisitante;
  const ajenos = esLocal ? partido.golesVisitante : partido.golesLocal;
  if (propios > ajenos) return "victoria";
  if (propios < ajenos) return "derrota";
  return "empate";
}

export const ETIQUETA_RESULTADO: Record<Resultado, string> = {
  victoria: "Victoria",
  empate: "Empate",
  derrota: "Derrota",
};

/** "Lionel Messi 78′ (penal)"; sin goleador: "Goleador no registrado". */
export function textoGol(gol: Pick<GolDTO, "jugador" | "minuto" | "esPenal">): string {
  const partes = [gol.jugador?.nombre ?? "Goleador no registrado"];
  if (gol.minuto !== null) partes.push(`${gol.minuto}′`);
  if (gol.esPenal) partes.push("(penal)");
  return partes.join(" ");
}

/** Goles de un equipo en un partido, por minuto; los que no tienen minuto van al final. */
export function golesDe(partido: PartidoDTO, equipoId: number): GolDTO[] {
  return partido.goles
    .filter((gol) => gol.equipoId === equipoId)
    .sort(
      (a, b) =>
        (a.minuto ?? Number.POSITIVE_INFINITY) - (b.minuto ?? Number.POSITIVE_INFINITY) ||
        a.id - b.id,
    );
}

/** Marcador en texto: "2 - 1", o "Por jugar" si el partido no se ha disputado. */
export function textoMarcador(partido: PartidoDTO): string {
  return partido.jugado ? `${partido.golesLocal} - ${partido.golesVisitante}` : "Por jugar";
}
