"use client";

import { Button, Chip, Table } from "@heroui/react";
import Link from "next/link";
import { useState } from "react";
import { etiquetaEstado, formatearFecha, type JugadorDTO } from "@/lib/jugadores";
import { useEsMovil } from "./useEsMovil";

const JUGADORES_POR_PAGINA = 10;

const claseBotonPagina =
  "rounded-md border border-(--pl-line) px-3 py-2 text-sm font-semibold text-(--pl-ink) transition-colors hover:bg-(--pl-surface) disabled:cursor-not-allowed disabled:opacity-40";

type Props = {
  jugadores: JugadorDTO[];
  onEditar: (jugador: JugadorDTO) => void;
  onEliminar: (jugador: JugadorDTO) => void;
};

const claseBotonEditar = "border-blue-500/40 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300";
const claseBotonEliminar = "border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-300";

function textoDisponibilidad(jugador: JugadorDTO) {
  return jugador.activo ? "Disponible para convocatoria" : "Fuera de convocatoria";
}

/** Los mismos datos y acciones que una fila de la tabla, apilados para pantallas estrechas (H-26). */
function TarjetaJugador({
  jugador,
  onEditar,
  onEliminar,
}: { jugador: JugadorDTO } & Pick<Props, "onEditar" | "onEliminar">) {
  return (
    <li className="pl-card">
      <span className="pl-table-numeral" aria-label={`Dorsal ${jugador.dorsal}`}>
        {String(jugador.dorsal).padStart(2, "0")}
      </span>

      <div className="min-w-0 self-center">
        <Link
          href={`/jugadores/${jugador.id}`}
          className="wrap-break-word font-semibold underline underline-offset-4"
        >
          {jugador.nombre}
        </Link>
        <p className="mt-0.5 text-xs text-(--pl-muted)">{textoDisponibilidad(jugador)}</p>
      </div>

      <div className="pl-card-datos">
        <span className="inline-flex rounded-md border border-(--pl-line) px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
          {jugador.posicion || "Sin posición"}
        </span>
        <Chip
          color={jugador.activo ? "success" : "danger"}
          variant="soft"
          size="sm"
          className={jugador.activo ? "pl-estado-activo" : "pl-estado-inactivo"}
        >
          {etiquetaEstado(jugador.activo)}
        </Chip>
        <span className="text-sm text-(--pl-muted)">
          <span className="sr-only">Fecha de nacimiento: </span>
          {formatearFecha(jugador.fechaNacimiento)}
        </span>
      </div>

      <div className="pl-card-acciones">
        <Button
          size="sm"
          variant="outline"
          onPress={() => onEditar(jugador)}
          aria-label={`Editar a ${jugador.nombre}`}
          className={claseBotonEditar}
        >
          Editar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() => onEliminar(jugador)}
          aria-label={`Eliminar a ${jugador.nombre}`}
          className={claseBotonEliminar}
        >
          Eliminar
        </Button>
      </div>
    </li>
  );
}

export default function PlayersTable({ jugadores, onEditar, onEliminar }: Props) {
  const [pagina, setPagina] = useState(1);
  const esMovil = useEsMovil();

  const totalJugadores = jugadores.length;
  const totalPaginas = Math.max(Math.ceil(totalJugadores / JUGADORES_POR_PAGINA), 1);
  // Si la lista se reduce (p. ej. tras eliminar), la página nunca queda fuera de rango.
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * JUGADORES_POR_PAGINA;
  const fin = Math.min(inicio + JUGADORES_POR_PAGINA, totalJugadores);
  const jugadoresPaginados = jugadores.slice(inicio, fin);

  return (
    <section className="pl-table-wrap">
      <div className="pl-table-topline">
        <span className="pl-table-topline-mark" />
        <span>LISTA OFICIAL</span>
        <span className="ml-auto">{String(totalJugadores).padStart(2, "0")} JUG.</span>
      </div>

      {esMovil ? (
        <ul className="pl-cards sm:hidden" aria-label="Jugadores del plantel">
          {jugadoresPaginados.map((jugador) => (
            <TarjetaJugador
              key={jugador.id}
              jugador={jugador}
              onEditar={onEditar}
              onEliminar={onEliminar}
            />
          ))}
        </ul>
      ) : (
      // max-sm:hidden: en móvil, la tabla del HTML del servidor no se llega a ver
      // mientras la página se hidrata y pasa a tarjetas.
      <Table className="pl-table max-sm:hidden">
        <Table.ScrollContainer>
          <Table.Content aria-label="Tabla de jugadores del plantel">
            <Table.Header>
              <Table.Column isRowHeader>Dorsal</Table.Column>
              <Table.Column>Jugador</Table.Column>
              <Table.Column>Posición</Table.Column>
              <Table.Column>Estado</Table.Column>
              <Table.Column>Fecha de nacimiento</Table.Column>
              <Table.Column>Acciones</Table.Column>
            </Table.Header>

            <Table.Body>
              {jugadoresPaginados.map((jugador) => (
                <Table.Row key={jugador.id} id={jugador.id}>
                  <Table.Cell>
                    <span className="pl-table-numeral">
                      {String(jugador.dorsal).padStart(2, "0")}
                    </span>
                  </Table.Cell>

                  <Table.Cell>
                    <div className="min-w-36">
                      <Link
                        href={`/jugadores/${jugador.id}`}
                        className="font-semibold underline underline-offset-4"
                      >
                        {jugador.nombre}
                      </Link>
                      <p className="mt-0.5 text-xs text-(--pl-muted)">
                        {textoDisponibilidad(jugador)}
                      </p>
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <span className="inline-flex rounded-md border border-(--pl-line) px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                      {jugador.posicion || "Sin posición"}
                    </span>
                  </Table.Cell>

                  <Table.Cell>
                    <Chip
          color={jugador.activo ? "success" : "danger"}
          variant="soft"
          size="sm"
          className={jugador.activo ? "pl-estado-activo" : "pl-estado-inactivo"}
        >
                      {etiquetaEstado(jugador.activo)}
                    </Chip>
                  </Table.Cell>

                  <Table.Cell>
                    <span className="whitespace-nowrap text-sm text-(--pl-muted)">
                      {formatearFecha(jugador.fechaNacimiento)}
                    </span>
                  </Table.Cell>

                  <Table.Cell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => onEditar(jugador)}
                        aria-label={`Editar a ${jugador.nombre}`}
                        className={claseBotonEditar}
                      >
                        Editar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => onEliminar(jugador)}
                        aria-label={`Eliminar a ${jugador.nombre}`}
                        className={claseBotonEliminar}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      )}

      <div className="flex flex-col gap-3 border-t border-(--pl-line) px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-(--pl-muted)">
          {totalJugadores === 0
            ? "No hay jugadores"
            : `Mostrando ${inicio + 1}–${fin} de ${totalJugadores} jugadores`}
        </p>

        <nav className="flex items-center justify-end gap-2" aria-label="Paginación de jugadores">
          <button
            type="button"
            onClick={() => setPagina(paginaActual - 1)}
            disabled={paginaActual <= 1}
            className={claseBotonPagina}
          >
            Anterior
          </button>

          <span className="px-2 text-sm font-bold text-(--pl-ink)" aria-live="polite">
            {paginaActual} / {totalPaginas}
          </span>

          <button
            type="button"
            onClick={() => setPagina(paginaActual + 1)}
            disabled={paginaActual >= totalPaginas}
            className={claseBotonPagina}
          >
            Siguiente
          </button>
        </nav>
      </div>
    </section>
  );
}
