import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import TablaPosiciones from "@/components/torneo/TablaPosiciones";
import { agruparPor } from "@/lib/torneo";
import { obtenerEquipos, obtenerPosiciones } from "@/lib/torneo-consultas";
import "../torneo.css";

export const metadata: Metadata = { title: "Equipos" };

export default async function EquiposPage() {
  // Las posiciones cambian con cada gol o partido: siempre se renderiza bajo demanda.
  await connection();
  const [equipos, posiciones] = await Promise.all([obtenerEquipos(), obtenerPosiciones()]);
  const grupos = agruparPor(posiciones, (fila) => fila.grupo);

  return (
    <div className="pl-page">
      <div className="tn-container">
        <header className="tn-header">
          <div className="tn-header-kicker">
            <span className="pl-kicker">FOOTBALL PLAYERS</span>
            <span className="pl-kicker-line" />
            <span className="pl-section-label">Selecciones del torneo</span>
          </div>
          <h1 className="pl-title tn-title">
            Equipos<span className="pl-title-accent">.</span>
          </h1>
          <p className="tn-lead">
            Las selecciones, sus grupos y la tabla de posiciones, calculada a partir de los
            partidos jugados.
          </p>
        </header>

        {equipos.length === 0 ? (
          <section className="pl-state">
            <span className="pl-state-kicker">SIN EQUIPOS</span>
            <h2 className="pl-display text-4xl font-extrabold sm:text-5xl">
              Aún no hay selecciones registradas.
            </h2>
          </section>
        ) : (
          <>
            <section className="tn-section" aria-labelledby="titulo-posiciones">
              <div className="tn-section-heading">
                <span className="pl-section-label">01 / FASE DE GRUPOS</span>
                <h2 id="titulo-posiciones">Posiciones</h2>
                <p>
                  Tres puntos por victoria y uno por empate. Desempatan la diferencia de goles y
                  los goles a favor.
                </p>
              </div>

              <div className="tn-stack tn-stack-2">
                {grupos.map(([grupo, filas]) => (
                  <TablaPosiciones key={grupo} grupo={grupo} filas={filas} />
                ))}
              </div>
            </section>

            <section className="tn-section" aria-labelledby="titulo-selecciones">
              <div className="tn-section-heading">
                <span className="pl-section-label">02 / DIRECTORIO</span>
                <h2 id="titulo-selecciones">Selecciones</h2>
              </div>

              <div className="pl-table-wrap">
                <div className="pl-table-topline">
                  <span className="pl-table-topline-mark" />
                  <span>TODAS LAS SELECCIONES</span>
                  <span className="ml-auto">{String(equipos.length).padStart(2, "0")} EQUIPOS</span>
                </div>

                <div
                  className="tn-scroll"
                  role="region"
                  aria-label="Directorio de selecciones"
                  tabIndex={0}
                >
                  <table className="tn-table">
                    <caption className="sr-only">Directorio de selecciones</caption>
                    <thead>
                      <tr>
                        <th scope="col">Selección</th>
                        <th scope="col">Confederación</th>
                        <th scope="col">Grupo</th>
                        <th scope="col" className="tn-num">
                          Ranking FIFA
                        </th>
                        <th scope="col" className="tn-num">
                          Jugadores
                        </th>
                        <th scope="col">Clasificada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipos.map((equipo) => (
                        <tr key={equipo.id}>
                          <th scope="row">
                            <Link href={`/equipos/${equipo.id}`}>{equipo.nombre}</Link>
                          </th>
                          <td>{equipo.confederacion}</td>
                          <td>{equipo.grupo}</td>
                          <td className="tn-num">{equipo.rankingFifa}</td>
                          <td className="tn-num">{equipo.jugadores}</td>
                          <td>{equipo.clasificado ? "Sí" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
