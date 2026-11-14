import Link from "next/link";
import type { PosicionDTO } from "@/lib/torneo";

type Props = {
  grupo: string;
  /** Filas ya ordenadas por los criterios de desempate. */
  filas: PosicionDTO[];
  /** Equipo que se está consultando: su fila se resalta. */
  equipoActualId?: number;
};

const COLUMNAS = [
  ["PJ", "Partidos jugados"],
  ["PG", "Partidos ganados"],
  ["PE", "Partidos empatados"],
  ["PP", "Partidos perdidos"],
  ["GF", "Goles a favor"],
  ["GC", "Goles en contra"],
  ["DG", "Diferencia de goles"],
  ["Pts", "Puntos"],
] as const;

function conSigno(numero: number) {
  // Signo menos tipográfico (U+2212), que los lectores de pantalla leen como «menos».
  if (numero > 0) return `+${numero}`;
  return numero < 0 ? `−${Math.abs(numero)}` : "0";
}

/** Tabla de posiciones de un grupo. Los datos vienen de la vista SQL, no de una tabla guardada. */
export default function TablaPosiciones({ grupo, filas, equipoActualId }: Props) {
  const titulo = `Posiciones del grupo ${grupo}`;

  return (
    <div className="pl-table-wrap">
      <div className="pl-table-topline">
        <span className="pl-table-topline-mark" />
        <span>GRUPO {grupo}</span>
        <span className="ml-auto">{String(filas.length).padStart(2, "0")} EQUIPOS</span>
      </div>

      <div className="tn-scroll" role="region" aria-label={titulo} tabIndex={0}>
        <table className="tn-table">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr>
              <th scope="col">
                <abbr title="Posición">Pos</abbr>
              </th>
              <th scope="col">Selección</th>
              {COLUMNAS.map(([sigla, nombre]) => (
                <th key={sigla} scope="col" className="tn-num">
                  <abbr title={nombre}>{sigla}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, indice) => (
              <tr
                key={fila.equipo.id}
                aria-current={fila.equipo.id === equipoActualId ? "true" : undefined}
              >
                <td className="tn-muted">{indice + 1}</td>
                <th scope="row">
                  <Link href={`/equipos/${fila.equipo.id}`}>{fila.equipo.nombre}</Link>
                </th>
                <td className="tn-num">{fila.pj}</td>
                <td className="tn-num">{fila.pg}</td>
                <td className="tn-num">{fila.pe}</td>
                <td className="tn-num">{fila.pp}</td>
                <td className="tn-num">{fila.gf}</td>
                <td className="tn-num">{fila.gc}</td>
                <td className="tn-num">{conSigno(fila.dg)}</td>
                <td className="tn-num tn-strong">{fila.puntos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
