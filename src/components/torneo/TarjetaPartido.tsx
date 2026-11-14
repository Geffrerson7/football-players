import Link from "next/link";
import {
  ETIQUETA_RESULTADO,
  formatearFechaPartido,
  golesDe,
  resultadoPara,
  textoMarcador,
  type GolDTO,
  type PartidoDTO,
  type Referencia,
} from "@/lib/torneo";

type Props = {
  partido: PartidoDTO;
  /** Muestra la fase junto a la fecha (cuando la lista no está agrupada por fase). */
  mostrarFase?: boolean;
  /** En la página de una selección: añade su resultado (victoria, empate o derrota). */
  equipoActualId?: number;
};

function Equipo({ equipo, esActual }: { equipo: Referencia; esActual: boolean }) {
  // La selección que se está consultando no se enlaza a sí misma.
  return esActual ? equipo.nombre : <Link href={`/equipos/${equipo.id}`}>{equipo.nombre}</Link>;
}

function Goles({ goles, equipo }: { goles: GolDTO[]; equipo: Referencia }) {
  const conGoleador = goles.filter((gol) => gol.jugador !== null);
  const sinGoleador = goles.length - conGoleador.length;

  return (
    <ul aria-label={`Goles de ${equipo.nombre}`}>
      {conGoleador.map((gol) => (
        <li key={gol.id}>
          <Link href={`/jugadores/${gol.jugador!.id}`}>{gol.jugador!.nombre}</Link>
          {gol.minuto !== null && ` ${gol.minuto}′`}
          {gol.esPenal && " (penal)"}
        </li>
      ))}
      {sinGoleador > 0 && (
        <li>
          {sinGoleador === 1
            ? "1 gol sin goleador registrado"
            : `${sinGoleador} goles sin goleador registrado`}
        </li>
      )}
    </ul>
  );
}

/** Un partido: fecha, equipos, marcador calculado desde los goles y goleadores. */
export default function TarjetaPartido({ partido, mostrarFase = false, equipoActualId }: Props) {
  const { local, visitante } = partido;
  const resultado = equipoActualId === undefined ? null : resultadoPara(partido, equipoActualId);
  const golesLocal = golesDe(partido, local.id);
  const golesVisitante = golesDe(partido, visitante.id);

  return (
    <li className="tn-match">
      <p className="tn-match-meta">
        <span>{formatearFechaPartido(partido.fecha)}</span>
        {mostrarFase && <span>{partido.fase}</span>}
        {resultado && (
          <span className={`tn-badge tn-badge-${resultado}`}>{ETIQUETA_RESULTADO[resultado]}</span>
        )}
      </p>

      <div className="tn-match-score">
        <span className="tn-team tn-team-local">
          <Equipo equipo={local} esActual={local.id === equipoActualId} />
        </span>

        <span className={partido.jugado ? "tn-score" : "tn-score tn-score-pendiente"}>
          {partido.jugado && (
            <span className="sr-only">
              {`${local.nombre} ${partido.golesLocal}, ${visitante.nombre} ${partido.golesVisitante}`}
            </span>
          )}
          <span aria-hidden={partido.jugado ? "true" : undefined}>{textoMarcador(partido)}</span>
        </span>

        <span className="tn-team">
          <Equipo equipo={visitante} esActual={visitante.id === equipoActualId} />
        </span>
      </div>

      {partido.goles.length > 0 && (
        <div className="tn-match-goals">
          <Goles goles={golesLocal} equipo={local} />
          <Goles goles={golesVisitante} equipo={visitante} />
        </div>
      )}
    </li>
  );
}
