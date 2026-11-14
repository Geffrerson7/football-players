"use client";

import { Button, Spinner } from "@heroui/react";

export function EstadoVacio({ onRegistrar }: { onRegistrar: () => void }) {
  return (
    <section className="pl-state">
      <span className="pl-state-kicker">EL EQUIPO TE ESPERA</span>
      <h3 className="pl-display text-4xl font-extrabold sm:text-5xl">El plantel está vacío.</h3>
      <p className="max-w-md text-(--pl-muted)">
        Registra al primer jugador para empezar a armar tu selección.
      </p>
      <Button onPress={onRegistrar} className="bg-(--pl-sash-fill) font-semibold text-white">
        Registrar jugador
      </Button>
    </section>
  );
}

export function EstadoError({
  mensaje,
  onReintentar,
}: {
  mensaje?: string;
  onReintentar: () => void;
}) {
  return (
    <section role="alert" className="pl-state pl-state-error">
      <span className="pl-state-kicker">ERROR DE CONEXIÓN</span>
      <h3 className="pl-display text-4xl font-extrabold sm:text-5xl">
        No pudimos cargar el plantel.
      </h3>
      <p className="max-w-lg text-(--pl-muted)">
        {mensaje ||
          "Comprueba tu conexión e inténtalo nuevamente. Tus jugadores no se han eliminado."}
      </p>
      <Button onPress={onReintentar} className="bg-(--pl-ink) font-semibold text-(--pl-bg)">
        Reintentar
      </Button>
    </section>
  );
}

export function EstadoSinResultados({
  busqueda,
  onLimpiar,
}: {
  /** Texto buscado; vacío si solo se filtró por posición. */
  busqueda?: string;
  onLimpiar: () => void;
}) {
  return (
    // role="status": el lector de pantalla anuncia que la búsqueda no dio resultados.
    <section role="status" className="pl-state">
      <span className="pl-state-kicker">SIN COINCIDENCIAS</span>
      <h3 className="pl-display text-3xl font-extrabold sm:text-4xl">
        {busqueda
          ? `Ningún jugador coincide con «${busqueda}».`
          : "No hay jugadores en esta posición."}
      </h3>
      <p className="text-(--pl-muted)">
        {busqueda
          ? "Revisa el nombre o quita los filtros para consultar el plantel."
          : "Prueba con otra posición para consultar el plantel."}
      </p>
      <Button variant="outline" onPress={onLimpiar}>
        Ver todos los jugadores
      </Button>
    </section>
  );
}

export function CargandoPlantel() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-(--pl-line) bg-(--pl-surface) px-4 py-3"
    >
      <Spinner className="text-success" size="lg" />

      <div>
        <p className="text-sm font-bold tracking-wide text-(--pl-ink)">Plantel</p>
        <p className="text-xs text-(--pl-muted)">Convocando jugadores...</p>
      </div>

      <span className="ml-auto text-lg" aria-hidden="true">
        ⚽
      </span>
    </div>
  );
}
