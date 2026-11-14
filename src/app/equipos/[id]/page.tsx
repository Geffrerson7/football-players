import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import TarjetaPartido from "@/components/torneo/TarjetaPartido";
import { idDeRuta } from "@/lib/rutas";
import { obtenerEquipo } from "@/lib/torneo-consultas";
import "../../jugadores/[id]/player-detail.css";
import "../../torneo.css";

type Props = { params: Promise<{ id: string }> };

// generateMetadata y la página comparten la misma consulta dentro de una petición.
const cargarEquipo = cache(async (idTexto: string) => {
  const id = idDeRuta(idTexto);
  return id === null ? null : obtenerEquipo(id);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const datos = await cargarEquipo((await params).id);
  return { title: datos?.equipo.nombre ?? "Equipo no encontrado" };
}

export default async function EquipoPage({ params }: Props) {
  const datos = await cargarEquipo((await params).id);
  if (!datos) notFound();

  const { equipo, plantilla, partidos, posicion } = datos;

  return (
    <div className="pl-page pl-detail-page">
      <div className="pl-detail-container">
        <nav className="pl-detail-breadcrumb" aria-label="Ruta de navegación">
          <Link href="/equipos">Equipos</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{equipo.nombre}</span>
        </nav>

        <header className="tn-header">
          <span className="pl-kicker">SELECCIÓN</span>
          <h1 className="pl-detail-name">{equipo.nombre}</h1>

          <div className="pl-detail-tags">
            <span className="pl-detail-tag">Grupo {equipo.grupo}</span>
            <span className="pl-detail-tag">{equipo.confederacion}</span>
            <span className="pl-detail-tag">Ranking FIFA {equipo.rankingFifa}</span>
            <span
              className={`pl-detail-status ${
                equipo.clasificado ? "pl-detail-status-active" : "pl-detail-status-inactive"
              }`}
            >
              {equipo.clasificado ? "Clasificada" : "No clasificada"}
            </span>
          </div>

          <Link className="pl-detail-back" href="/equipos">
            ← Volver a equipos
          </Link>
        </header>

        <section className="pl-detail-section" aria-labelledby="titulo-campana">
          <div className="pl-detail-section-heading">
            <span className="pl-section-label">01 / FASE DE GRUPOS</span>
            <h2 id="titulo-campana">Campaña</h2>
          </div>

          <dl className="pl-detail-grid">
            <div className="pl-detail-field">
              <dt>Puntos</dt>
              <dd>{posicion?.puntos ?? 0}</dd>
            </div>
            <div className="pl-detail-field">
              <dt>Partidos jugados</dt>
              <dd>{posicion?.pj ?? 0}</dd>
            </div>
            <div className="pl-detail-field">
              <dt>Ganados · Empatados · Perdidos</dt>
              <dd>
                {posicion?.pg ?? 0} · {posicion?.pe ?? 0} · {posicion?.pp ?? 0}
              </dd>
            </div>
            <div className="pl-detail-field">
              <dt>Goles a favor</dt>
              <dd>{posicion?.gf ?? 0}</dd>
            </div>
            <div className="pl-detail-field">
              <dt>Goles en contra</dt>
              <dd>{posicion?.gc ?? 0}</dd>
            </div>
            <div className="pl-detail-field">
              <dt>Jugadores registrados</dt>
              <dd>{equipo.jugadores}</dd>
            </div>
          </dl>
        </section>

        <section className="pl-detail-section" aria-labelledby="titulo-plantilla">
          <div className="pl-detail-section-heading">
            <span className="pl-section-label">02 / PLANTILLA</span>
            <h2 id="titulo-plantilla">Jugadores</h2>
          </div>

          <div className="pl-table-wrap">
            {plantilla.length === 0 ? (
              <p className="tn-empty">Esta selección aún no tiene jugadores registrados.</p>
            ) : (
              <ul className="tn-squad">
                {plantilla.map((jugador) => (
                  <li key={jugador.id}>
                    <span className="pl-table-numeral" aria-label={`Dorsal ${jugador.dorsal}`}>
                      {String(jugador.dorsal).padStart(2, "0")}
                    </span>
                    <div className="tn-squad-info">
                      <Link href={`/jugadores/${jugador.id}`}>{jugador.nombre}</Link>
                      <p>
                        {jugador.posicion || "Sin posición"}
                        {!jugador.activo && " · Inactivo"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="pl-detail-section" aria-labelledby="titulo-partidos">
          <div className="pl-detail-section-heading">
            <span className="pl-section-label">03 / CALENDARIO</span>
            <h2 id="titulo-partidos">Partidos</h2>
          </div>

          <div className="pl-table-wrap">
            {partidos.length === 0 ? (
              <p className="tn-empty">Esta selección aún no tiene partidos programados.</p>
            ) : (
              <ul className="tn-matches">
                {partidos.map((partido) => (
                  <TarjetaPartido
                    key={partido.id}
                    partido={partido}
                    mostrarFase
                    equipoActualId={equipo.id}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
