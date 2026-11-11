import Link from "next/link";
import "./player-detail.css";

export default function JugadorNoEncontrado() {
  return (
    <div className="pl-page pl-detail-page">
      <div className="pl-detail-state pl-detail-error" role="alert">
        <span className="pl-kicker">ERROR / 404</span>
        <h1>No encontramos al jugador solicitado.</h1>
        <p>Comprueba el enlace o regresa al listado del plantel.</p>
        <Link className="pl-detail-back" href="/jugadores">
          ← Volver al plantel
        </Link>
      </div>
    </div>
  );
}
