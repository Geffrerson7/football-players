import "server-only";
import type { Jugador } from "@/generated/prisma/client";
import { fechaAISO, type JugadorDTO } from "@/lib/jugadores";
import { prisma } from "@/lib/prisma";
import { exigirSesion } from "@/lib/sesion";

const camposJugador = {
  id: true,
  nombre: true,
  posicion: true,
  dorsal: true,
  activo: true,
  fechaNacimiento: true,
} as const;

export function aJugadorDTO(
  jugador: Pick<Jugador, keyof typeof camposJugador>,
): JugadorDTO {
  return {
    id: jugador.id,
    nombre: jugador.nombre,
    posicion: jugador.posicion,
    dorsal: jugador.dorsal,
    // La columna admite NULL (DEFAULT true); un nulo se trata como activo.
    activo: jugador.activo ?? true,
    fechaNacimiento: fechaAISO(jugador.fechaNacimiento),
  };
}

// Las consultas exigen sesión por su cuenta (cualquier rol puede leer): no dependen
// de que src/proxy.ts haya filtrado antes la petición.

export async function obtenerJugadores(): Promise<JugadorDTO[]> {
  await exigirSesion();
  const jugadores = await prisma.jugador.findMany({
    select: camposJugador,
    orderBy: [{ dorsal: "asc" }, { id: "asc" }],
  });
  return jugadores.map(aJugadorDTO);
}

export async function obtenerJugadorConDetalle(id: number) {
  await exigirSesion();
  const jugador = await prisma.jugador.findUnique({
    where: { id },
    select: { ...camposJugador, detalle: true },
  });
  if (!jugador) return null;

  const { detalle } = jugador;
  return {
    jugador: aJugadorDTO(jugador),
    detalle: detalle
      ? {
          nacionalidad: detalle.nacionalidad,
          alturaCm: detalle.alturaCm,
          pesoKg: detalle.pesoKg?.toString() ?? null,
          pieHabil: detalle.pieHabil,
          clubActual: detalle.clubActual,
          fotoUrl: detalle.fotoUrl,
          biografia: detalle.biografia,
        }
      : null,
  };
}
