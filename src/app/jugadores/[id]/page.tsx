import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import PlayerPhoto from "@/components/jugadores/PlayerPhoto";
import { calcularEdad, etiquetaEstado, formatearFecha } from "@/lib/jugadores";
import { obtenerJugadorConDetalle } from "../data";
import "./player-detail.css";

type Props = { params: Promise<{ id: string }> };

// generateMetadata y la página comparten la misma consulta dentro de una petición.
const cargarPerfil = cache(async (idTexto: string) => {
  if (!/^\d+$/.test(idTexto)) return null;
  const id = Number(idTexto);
  if (!Number.isSafeInteger(id) || id > 2_147_483_647) return null; // rango de INTEGER en Postgres
  return obtenerJugadorConDetalle(id);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const perfil = await cargarPerfil((await params).id);
  return { title: perfil?.jugador.nombre ?? "Jugador no encontrado" };
}

const NO_DISPONIBLE = "No disponible";

export default async function PerfilJugadorPage({ params }: Props) {
  const perfil = await cargarPerfil((await params).id);
  if (!perfil) notFound();

  const { jugador, detalle } = perfil;
  const edad = calcularEdad(jugador.fechaNacimiento);

  return (
    <div className="pl-page pl-detail-page">
      <div className="pl-detail-container">
        <nav className="pl-detail-breadcrumb" aria-label="Ruta de navegación">
          <Link href="/jugadores">Plantel</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{jugador.nombre}</span>
        </nav>

        <section className="pl-detail-hero">
          <PlayerPhoto nombre={jugador.nombre} fotoUrl={detalle?.fotoUrl ?? null} dorsal={jugador.dorsal} />

          <div className="pl-detail-intro">
            <span className="pl-kicker">PERFIL DEL JUGADOR</span>

            <h1 className="pl-detail-name">{jugador.nombre}</h1>

            <p className="pl-detail-position">{jugador.posicion || "Posición no registrada"}</p>

            <div className="pl-detail-tags">
              <span className="pl-detail-tag">Dorsal {jugador.dorsal}</span>
              <span
                className={`pl-detail-status ${
                  jugador.activo ? "pl-detail-status-active" : "pl-detail-status-inactive"
                }`}
              >
                {etiquetaEstado(jugador.activo)}
              </span>
            </div>

            <Link className="pl-detail-back" href="/jugadores">
              ← Volver al plantel
            </Link>
          </div>
        </section>

        <section className="pl-detail-section">
          <div className="pl-detail-section-heading">
            <span className="pl-section-label">01 / INFORMACIÓN</span>
            <h2>Ficha deportiva</h2>
          </div>

          <dl className="pl-detail-grid">
            <div className="pl-detail-field">
              <dt>Nacionalidad</dt>
              <dd>{detalle?.nacionalidad || NO_DISPONIBLE}</dd>
            </div>

            <div className="pl-detail-field">
              <dt>Fecha de nacimiento</dt>
              <dd>{formatearFecha(jugador.fechaNacimiento, "largo", NO_DISPONIBLE)}</dd>
            </div>

            <div className="pl-detail-field">
              <dt>Edad</dt>
              <dd>{edad !== null ? `${edad} años` : NO_DISPONIBLE}</dd>
            </div>

            <div className="pl-detail-field">
              <dt>Altura</dt>
              <dd>{detalle?.alturaCm ? `${detalle.alturaCm} cm` : NO_DISPONIBLE}</dd>
            </div>

            <div className="pl-detail-field">
              <dt>Peso</dt>
              <dd>{detalle?.pesoKg ? `${detalle.pesoKg} kg` : NO_DISPONIBLE}</dd>
            </div>

            <div className="pl-detail-field">
              <dt>Pie hábil</dt>
              <dd>{detalle?.pieHabil || NO_DISPONIBLE}</dd>
            </div>

            <div className="pl-detail-field pl-detail-field-wide">
              <dt>Club actual</dt>
              <dd>{detalle?.clubActual || NO_DISPONIBLE}</dd>
            </div>
          </dl>
        </section>

        <section className="pl-detail-section pl-detail-biography">
          <div className="pl-detail-section-heading">
            <span className="pl-section-label">02 / TRAYECTORIA</span>
            <h2>Sobre el jugador</h2>
          </div>

          <p>
            {detalle?.biografia ||
              "La información biográfica de este jugador aún no está disponible."}
          </p>
        </section>
      </div>
    </div>
  );
}
