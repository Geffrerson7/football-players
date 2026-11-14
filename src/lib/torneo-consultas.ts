import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { exigirSesion } from "./sesion";
import {
  ordenarPosiciones,
  type EquipoDTO,
  type GoleadorDTO,
  type PartidoDTO,
  type PosicionDTO,
  type Referencia,
} from "./torneo";

// Consultas de solo lectura del torneo. Como las de jugadores, cada una exige sesión
// por su cuenta (cualquier rol puede leer), sin depender de src/proxy.ts.
//
// El marcador y la tabla de posiciones no están guardados: se leen de las vistas SQL
// `marcadores` y `posiciones_por_grupo`, que los calculan desde `goles` y `partidos`
// (H-32 y H-33). Prisma no modela vistas sin funciones experimentales, así que se
// consultan con SQL; no reciben datos del usuario.

const refEquipo = { select: { id: true, nombre: true } } as const;

const camposPartido = {
  id: true,
  fase: true,
  fecha: true,
  jugado: true,
  local: refEquipo,
  visitante: refEquipo,
  goles: {
    select: {
      id: true,
      equipoId: true,
      minuto: true,
      esPenal: true,
      jugador: { select: { id: true, nombre: true } },
    },
  },
} as const;

type FilaMarcador = { partido_id: number; goles_local: number; goles_visitante: number };

async function marcadores(): Promise<Map<number, FilaMarcador>> {
  const filas = await prisma.$queryRaw<FilaMarcador[]>`
    SELECT "partido_id", "goles_local", "goles_visitante" FROM "marcadores"`;
  return new Map(filas.map((fila) => [fila.partido_id, fila]));
}

async function cargarPartidos(where?: Prisma.PartidoWhereInput): Promise<PartidoDTO[]> {
  const [partidos, marcadorDe] = await Promise.all([
    prisma.partido.findMany({
      where,
      select: camposPartido,
      // Los partidos sin fecha quedan al final.
      orderBy: [{ fecha: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    }),
    marcadores(),
  ]);

  return partidos.map((partido) => ({
    id: partido.id,
    fase: partido.fase,
    fecha: partido.fecha?.toISOString() ?? null,
    jugado: partido.jugado,
    local: partido.local,
    visitante: partido.visitante,
    golesLocal: marcadorDe.get(partido.id)?.goles_local ?? 0,
    golesVisitante: marcadorDe.get(partido.id)?.goles_visitante ?? 0,
    goles: partido.goles.map((gol) => ({ ...gol, esPenal: gol.esPenal ?? false })),
  }));
}

/** Todos los partidos, por fecha. */
export async function obtenerPartidos(): Promise<PartidoDTO[]> {
  await exigirSesion();
  return cargarPartidos();
}

type FilaPosicion = {
  equipo_id: number;
  nombre: string;
  grupo: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  puntos: number;
};

function aPosicionDTO(fila: FilaPosicion): PosicionDTO {
  const { equipo_id, nombre, grupo, ...numeros } = fila;
  return {
    equipo: { id: equipo_id, nombre },
    grupo: grupo.trim(),
    ...numeros,
    dg: fila.gf - fila.gc,
  };
}

/** Tabla de posiciones de todos los equipos, ya ordenada por los criterios de desempate. */
export async function obtenerPosiciones(): Promise<PosicionDTO[]> {
  await exigirSesion();
  const filas = await prisma.$queryRaw<FilaPosicion[]>`
    SELECT pos."equipo_id", e."nombre", pos."grupo", pos."pj", pos."pg", pos."pe", pos."pp",
           pos."gf", pos."gc", pos."puntos"
    FROM "posiciones_por_grupo" pos
    JOIN "equipos" e ON e."id" = pos."equipo_id"`;
  return ordenarPosiciones(filas.map(aPosicionDTO));
}

const camposEquipo = {
  id: true,
  nombre: true,
  confederacion: true,
  grupo: true,
  rankingFifa: true,
  clasificado: true,
  _count: { select: { jugadores: true } },
} as const;

function aEquipoDTO(equipo: Prisma.EquipoGetPayload<{ select: typeof camposEquipo }>): EquipoDTO {
  return {
    id: equipo.id,
    nombre: equipo.nombre,
    confederacion: equipo.confederacion,
    grupo: equipo.grupo.trim(),
    rankingFifa: equipo.rankingFifa,
    // La columna admite NULL (DEFAULT true); un nulo se trata como clasificado.
    clasificado: equipo.clasificado ?? true,
    jugadores: equipo._count.jugadores,
  };
}

export async function obtenerEquipos(): Promise<EquipoDTO[]> {
  await exigirSesion();
  const equipos = await prisma.equipo.findMany({
    select: camposEquipo,
    orderBy: [{ nombre: "asc" }, { id: "asc" }],
  });
  return equipos.map(aEquipoDTO);
}

/** Id y nombre de cada selección, para el formulario de jugadores. */
export async function obtenerOpcionesDeEquipo(): Promise<Referencia[]> {
  await exigirSesion();
  return prisma.equipo.findMany({
    select: { id: true, nombre: true },
    orderBy: [{ nombre: "asc" }, { id: "asc" }],
  });
}

/** Una selección con su plantilla, sus partidos y su fila en la tabla de posiciones. */
export async function obtenerEquipo(id: number) {
  await exigirSesion();
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    select: {
      ...camposEquipo,
      jugadores: {
        select: { id: true, nombre: true, posicion: true, dorsal: true, activo: true },
        orderBy: [{ dorsal: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!equipo) return null;

  const [partidos, filas] = await Promise.all([
    cargarPartidos({ OR: [{ localId: id }, { visitanteId: id }] }),
    prisma.$queryRaw<FilaPosicion[]>`
      SELECT pos."equipo_id", e."nombre", pos."grupo", pos."pj", pos."pg", pos."pe", pos."pp",
             pos."gf", pos."gc", pos."puntos"
      FROM "posiciones_por_grupo" pos
      JOIN "equipos" e ON e."id" = pos."equipo_id"
      WHERE pos."equipo_id" = ${id}`,
  ]);

  return {
    equipo: aEquipoDTO(equipo),
    plantilla: equipo.jugadores.map((jugador) => ({
      ...jugador,
      activo: jugador.activo ?? true,
    })),
    partidos,
    posicion: filas[0] ? aPosicionDTO(filas[0]) : null,
  };
}

/** Máximos goleadores. Los goles sin goleador registrado no cuentan. */
export async function obtenerGoleadores(limite = 10): Promise<GoleadorDTO[]> {
  await exigirSesion();
  const [totales, dePenal] = await Promise.all([
    prisma.gol.groupBy({
      by: ["jugadorId"],
      where: { jugadorId: { not: null } },
      _count: { _all: true },
    }),
    prisma.gol.groupBy({
      by: ["jugadorId"],
      where: { jugadorId: { not: null }, esPenal: true },
      _count: { _all: true },
    }),
  ]);

  const jugadores = await prisma.jugador.findMany({
    where: { id: { in: totales.flatMap((t) => (t.jugadorId === null ? [] : [t.jugadorId])) } },
    select: { id: true, nombre: true, equipo: refEquipo },
  });
  const jugadorPorId = new Map(jugadores.map((j) => [j.id, j]));
  const penalesPorId = new Map(dePenal.map((p) => [p.jugadorId, p._count._all]));

  return totales
    .flatMap((total) => {
      const jugador = total.jugadorId === null ? undefined : jugadorPorId.get(total.jugadorId);
      if (!jugador) return [];
      return [
        {
          jugador: { id: jugador.id, nombre: jugador.nombre },
          equipo: jugador.equipo,
          goles: total._count._all,
          penales: penalesPorId.get(jugador.id) ?? 0,
        },
      ];
    })
    .sort((a, b) => b.goles - a.goles || a.jugador.nombre.localeCompare(b.jugador.nombre, "es"))
    .slice(0, limite);
}

export type GolDeJugador = {
  id: number;
  minuto: number | null;
  esPenal: boolean;
  partido: { id: number; fase: string; fecha: string | null };
  /** Equipo contra el que marcó. */
  rival: Referencia;
};

export type EstadisticasJugador = {
  goles: number;
  penales: number;
  partidosConGol: number;
  detalle: GolDeJugador[];
};

/** Goles de un jugador, del más antiguo al más reciente. */
export async function obtenerEstadisticasJugador(id: number): Promise<EstadisticasJugador> {
  await exigirSesion();
  const goles = await prisma.gol.findMany({
    where: { jugadorId: id },
    select: {
      id: true,
      equipoId: true,
      minuto: true,
      esPenal: true,
      partido: {
        select: { id: true, fase: true, fecha: true, local: refEquipo, visitante: refEquipo },
      },
    },
    orderBy: [{ partido: { fecha: { sort: "asc", nulls: "last" } } }, { minuto: "asc" }, { id: "asc" }],
  });

  return {
    goles: goles.length,
    penales: goles.filter((gol) => gol.esPenal).length,
    partidosConGol: new Set(goles.map((gol) => gol.partido.id)).size,
    detalle: goles.map(({ id: golId, equipoId, minuto, esPenal, partido }) => ({
      id: golId,
      minuto,
      esPenal: esPenal ?? false,
      partido: {
        id: partido.id,
        fase: partido.fase,
        fecha: partido.fecha?.toISOString() ?? null,
      },
      rival: partido.local.id === equipoId ? partido.visitante : partido.local,
    })),
  };
}
