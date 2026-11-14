import Link from "next/link";
import "./home.css";

// href: null = sección aún sin implementar (H-08): se muestra «Próximamente» en lugar del enlace.
const secciones: {
  numero: string;
  titulo: string;
  descripcion: string;
  href: string | null;
  accion: string;
}[] = [
  {
    numero: "01",
    titulo: "Jugadores",
    descripcion:
      "Consulta el plantel, explora perfiles y conoce la información de cada futbolista.",
    href: "/jugadores",
    accion: "Explorar jugadores",
  },
  {
    numero: "02",
    titulo: "Equipos",
    descripcion: "Organiza las selecciones, sus confederaciones y sus grupos.",
    href: null,
    accion: "Ver equipos",
  },
  {
    numero: "03",
    titulo: "Partidos",
    descripcion: "Consulta los enfrentamientos, resultados y las distintas fases del torneo.",
    href: null,
    accion: "Explorar partidos",
  },
];

export default function Home() {
  return (
    <div className="pl-page fp-home">
      <section className="fp-home-hero">
        <div className="fp-home-pitch-lines" aria-hidden="true">
          <span className="fp-home-center-circle" />
          <span className="fp-home-center-line" />
        </div>

        <div className="fp-home-hero-inner">
          <div className="fp-home-kicker">
            <span className="pl-kicker-line" />
            <span className="pl-kicker">THE BEAUTIFUL GAME</span>
          </div>

          <h1 className="fp-home-title">
            FOOTBALL
            <span>PLAYERS.</span>
          </h1>

          <div className="fp-home-band">
            <span>UN JUEGO.</span>
            <span>MILES DE HISTORIAS.</span>
          </div>

          <div className="fp-home-intro">
            <p>
              Explora el mundo del fútbol desde sus protagonistas hasta los equipos y partidos
              que hacen historia.
            </p>

            <Link href="/jugadores" className="fp-home-cta">
              EXPLORAR PLANTEL
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="fp-home-edition">
            <span>FOOTBALL DATABASE</span>
            <span>EDITION / 2026</span>
          </div>
        </div>
      </section>

      <section className="fp-home-sections">
        <div className="fp-home-section-heading">
          <div>
            <span className="pl-section-label">EXPLORA LA PLATAFORMA</span>
            <h2>EL UNIVERSO DEL FÚTBOL</h2>
          </div>

          <span className="fp-home-section-count">03 SECCIONES</span>
        </div>

        <div className="fp-home-card-grid">
          {secciones.map((seccion) => (
            <article className="fp-home-card" key={seccion.numero}>
              <div className="fp-home-card-top">
                <span className="fp-home-card-number">{seccion.numero}</span>
                <span className="fp-home-card-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>

              <h3>{seccion.titulo}</h3>
              <p>{seccion.descripcion}</p>

              {seccion.href ? (
                <Link href={seccion.href} className="fp-home-card-link">
                  {seccion.accion}
                  <span aria-hidden="true"> →</span>
                </Link>
              ) : (
                <p className="fp-home-card-pendiente">
                  <span>Próximamente</span>
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
