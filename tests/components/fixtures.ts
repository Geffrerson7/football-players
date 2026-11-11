import type { JugadorDTO } from "@/lib/jugadores";

const POSICIONES_CICLO = ["Delantero", "Mediocampista", "Defensa", "Portero"] as const;

export function jugador(datos: Partial<JugadorDTO> & { id: number }): JugadorDTO {
  return {
    nombre: `Jugador ${datos.id}`,
    posicion: "Delantero",
    dorsal: datos.id,
    activo: true,
    fechaNacimiento: "2000-01-01",
    ...datos,
  };
}

/** `cantidad` jugadores ordenados por dorsal, con posiciones alternadas. */
export function plantel(cantidad: number): JugadorDTO[] {
  return Array.from({ length: cantidad }, (_, i) =>
    jugador({ id: i + 1, posicion: POSICIONES_CICLO[i % POSICIONES_CICLO.length] }),
  );
}
