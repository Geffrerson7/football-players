import Link from "next/link";
import "../../jugadores/[id]/player-detail.css";

export default function EquipoNoEncontrado() {
  return (
    <div className="pl-page pl-detail-page">
      <div className="pl-detail-state pl-detail-error" role="alert">
        <span className="pl-kicker">ERROR / 404</span>
        <h1>No encontramos la selección solicitada.</h1>
        <p>Comprueba el enlace o regresa al listado de equipos.</p>
        <Link className="pl-detail-back" href="/equipos">
          ← Volver a equipos
        </Link>
      </div>
    </div>
  );
}
