"use client";

import { Button } from "@heroui/react";
import { useMemo, useState } from "react";
import type { JugadorDTO } from "@/lib/jugadores";
import DeletePlayerModal from "./DeletePlayerModal";
import { EstadoSinResultados, EstadoVacio } from "./EstadosPlantel";
import PlayerFormModal from "./PlayerFormModal";
import PlayersTable from "./PlayersTable";

const TODOS = "todos";

export default function PlayersView({ jugadores }: { jugadores: JugadorDTO[] }) {
  const [filtro, setFiltro] = useState<string>(TODOS);

  // Formulario compartido para crear (jugadorEditado = null) y editar.
  const [formAbierto, setFormAbierto] = useState(false);
  const [jugadorEditado, setJugadorEditado] = useState<JugadorDTO | null>(null);
  // Cambia en cada apertura para montar un formulario limpio: cancelar descarta los cambios.
  const [aperturaForm, setAperturaForm] = useState(0);

  const [eliminarAbierto, setEliminarAbierto] = useState(false);
  const [jugadorAEliminar, setJugadorAEliminar] = useState<JugadorDTO | null>(null);

  const posiciones = useMemo(
    () =>
      [...new Set(jugadores.map((j) => j.posicion).filter((p): p is string => Boolean(p)))].sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
    [jugadores],
  );

  // El servidor ya los entrega ordenados por dorsal.
  const visibles = useMemo(
    () => (filtro === TODOS ? jugadores : jugadores.filter((j) => j.posicion === filtro)),
    [jugadores, filtro],
  );

  const total = jugadores.length;

  function abrirFormulario(jugador: JugadorDTO | null) {
    setJugadorEditado(jugador);
    setAperturaForm((n) => n + 1);
    setFormAbierto(true);
  }

  function abrirEliminar(jugador: JugadorDTO) {
    setJugadorAEliminar(jugador);
    setEliminarAbierto(true);
  }

  return (
    <div className="pl-page">
      <section className="pl-hero pb-14 sm:pb-20">
        <div className="pl-hero-inner mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="pl-kicker">FOOTBALL PLAYERS</span>
            <span className="pl-kicker-line" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-(--pl-muted)">
              Tabla de jugadores
            </span>
          </div>

          <h1 className="pl-title">
            Football <span className="pl-title-accent">Players</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-(--pl-muted) sm:text-lg">
            Cada dorsal cuenta. Consulta, organiza y administra a los jugadores de tu selección.
          </p>
        </div>

        <div className="relative mt-10 sm:mt-14">
          <div className="pl-band">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8 sm:py-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                  Lista de todos los jugadores
                </p>
                <p
                  className="pl-display mt-1 text-4xl font-extrabold leading-none sm:text-5xl"
                  aria-live="polite"
                >
                  {total} {total === 1 ? "jugador" : "jugadores"}
                </p>
              </div>

              <Button
                size="lg"
                onPress={() => abrirFormulario(null)}
                className="bg-white font-bold text-[#0f2a1e] shadow-sm transition-transform hover:scale-[1.02]"
              >
                + Registrar jugador
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="pl-section-label">PLANTEL</p>
            <h2 className="pl-display mt-1 text-5xl font-black leading-none sm:text-6xl">
              Jugadores<span className="text-(--pl-sash)">.</span>
            </h2>
          </div>

          {posiciones.length > 0 && (
            <div
              role="group"
              aria-label="Filtrar jugadores por posición"
              className="flex flex-wrap gap-2"
            >
              {[TODOS, ...posiciones].map((posicion) => {
                const activo = filtro === posicion;
                return (
                  <Button
                    key={posicion}
                    size="sm"
                    variant={activo ? "primary" : "outline"}
                    aria-pressed={activo}
                    onPress={() => setFiltro(posicion)}
                    className={
                      activo
                        ? "bg-(--pl-ink) font-bold text-(--pl-bg)"
                        : "border-(--pl-line) text-(--pl-ink)"
                    }
                  >
                    {posicion === TODOS ? "Todos" : posicion}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {total === 0 && <EstadoVacio onRegistrar={() => abrirFormulario(null)} />}

        {total > 0 && visibles.length === 0 && (
          <EstadoSinResultados onLimpiar={() => setFiltro(TODOS)} />
        )}

        {visibles.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2 text-sm text-(--pl-muted)">
              <p className="uppercase tracking-wider">Ordenados por dorsal</p>
            </div>

            <PlayersTable
              key={filtro}
              jugadores={visibles}
              onEditar={abrirFormulario}
              onEliminar={abrirEliminar}
            />
          </>
        )}
      </div>

      <PlayerFormModal
        key={aperturaForm}
        jugador={jugadorEditado}
        isOpen={formAbierto}
        onOpenChange={setFormAbierto}
        onGuardado={(_jugador, esNuevo) => {
          if (esNuevo) setFiltro(TODOS);
        }}
      />

      <DeletePlayerModal
        jugador={jugadorAEliminar}
        isOpen={eliminarAbierto}
        onOpenChange={setEliminarAbierto}
      />
    </div>
  );
}
