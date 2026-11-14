import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import TarjetaPartido from "@/components/torneo/TarjetaPartido";
import { agruparPor } from "@/lib/torneo";
import { obtenerGoleadores, obtenerPartidos } from "@/lib/torneo-consultas";
import "../torneo.css";

export const metadata: Metadata = { title: "Partidos" };

export default async function PartidosPage() {
  // Los marcadores se calculan en cada consulta: siempre se renderiza bajo demanda.
  await connection();
  const [partidos, goleadores] = await Promise.all([obtenerPartidos(), obtenerGoleadores()]);
  const fases = agruparPor(partidos, (partido) => partido.fase);

  return (
    <div className="pl-page">
      <div className="tn-container">
        <header className="tn-header">
          <div className="tn-header-kicker">
            <span className="pl-kicker">FOOTBALL PLAYERS</span>
            <span className="pl-kicker-line" />
            <span className="pl-section-label">Calendario y resultados</span>
          </div>
          <h1 className="pl-title tn-title">
            Partidos<span className="pl-title-accent">.</span>
          </h1>
          <p className="tn-lead">
            Los enfrentamientos de cada fase. El marcador se calcula a partir de los goles
            registrados.
          </p>
        </header>

        {partidos.length === 0 ? (
          <section className="pl-state">
            <span className="pl-state-kicker">SIN PARTIDOS</span>
            <h2 className="pl-display text-4xl font-extrabold sm:text-5xl">
              Aún no hay partidos programados.
            </h2>
          </section>
        ) : (
          fases.map(([fase, partidosDeLaFase], indice) => (
            <section key={fase} className="tn-section" aria-labelledby={`titulo-fase-${indice}`}>
              <div className="tn-section-heading">
                <span className="pl-section-label">FASE</span>
                <h2 id={`titulo-fase-${indice}`}>{fase}</h2>
              </div>

              <div className="pl-table-wrap">
                <div className="pl-table-topline">
                  <span className="pl-table-topline-mark" />
                  <span>{fase.toUpperCase()}</span>
                  <span className="ml-auto">
                    {String(partidosDeLaFase.length).padStart(2, "0")} PART.
                  </span>
                </div>
                <ul className="tn-matches">
                  {partidosDeLaFase.map((partido) => (
                    <TarjetaPartido key={partido.id} partido={partido} />
                  ))}
                </ul>
              </div>
            </section>
          ))
        )}

        <section className="tn-section" aria-labelledby="titulo-goleadores">
          <div className="tn-section-heading">
            <span className="pl-section-label">ESTADÍSTICAS</span>
            <h2 id="titulo-goleadores">Goleadores</h2>
            <p>Solo cuentan los goles con goleador registrado.</p>
          </div>

          <div className="pl-table-wrap">
            {goleadores.length === 0 ? (
              <p className="tn-empty">Aún no hay goles con goleador registrado.</p>
            ) : (
              <div className="tn-scroll" role="region" aria-label="Tabla de goleadores" tabIndex={0}>
                <table className="tn-table">
                  <caption className="sr-only">Tabla de goleadores</caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        <abbr title="Posición">Pos</abbr>
                      </th>
                      <th scope="col">Jugador</th>
                      <th scope="col">Selección</th>
                      <th scope="col" className="tn-num">
                        Goles
                      </th>
                      <th scope="col" className="tn-num">
                        De penal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {goleadores.map((goleador, indice) => (
                      <tr key={goleador.jugador.id}>
                        <td className="tn-muted">{indice + 1}</td>
                        <th scope="row">
                          <Link href={`/jugadores/${goleador.jugador.id}`}>
                            {goleador.jugador.nombre}
                          </Link>
                        </th>
                        <td>
                          {goleador.equipo ? (
                            <Link href={`/equipos/${goleador.equipo.id}`}>
                              {goleador.equipo.nombre}
                            </Link>
                          ) : (
                            <span className="tn-muted">Sin selección</span>
                          )}
                        </td>
                        <td className="tn-num tn-strong">{goleador.goles}</td>
                        <td className="tn-num">{goleador.penales}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
