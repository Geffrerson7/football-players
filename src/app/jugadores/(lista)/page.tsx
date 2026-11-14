import type { Metadata } from "next";
import { connection } from "next/server";
import PlayersView from "@/components/jugadores/PlayersView";
import { obtenerOpcionesDeEquipo } from "@/lib/torneo-consultas";
import { obtenerJugadores } from "../data";

export const metadata: Metadata = { title: "Jugadores" };

export default async function JugadoresPage() {
  // Los datos cambian con cada alta, edición o baja: siempre se renderiza bajo demanda.
  await connection();
  const [jugadores, equipos] = await Promise.all([obtenerJugadores(), obtenerOpcionesDeEquipo()]);

  return <PlayersView jugadores={jugadores} equipos={equipos} />;
}
