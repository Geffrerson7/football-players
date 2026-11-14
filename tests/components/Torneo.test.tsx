import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TablaPosiciones from "@/components/torneo/TablaPosiciones";
import TarjetaPartido from "@/components/torneo/TarjetaPartido";
import type { PartidoDTO, PosicionDTO } from "@/lib/torneo";

const ESPANA = { id: 1, nombre: "España" };
const PERU = { id: 2, nombre: "Perú" };

function posicion(datos: Partial<PosicionDTO> & Pick<PosicionDTO, "equipo">): PosicionDTO {
  return { grupo: "A", pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, puntos: 0, ...datos };
}

function partido(datos: Partial<PartidoDTO> = {}): PartidoDTO {
  return {
    id: 1,
    fase: "Grupos",
    fecha: "2026-06-11T18:00:00.000Z",
    jugado: true,
    local: ESPANA,
    visitante: PERU,
    golesLocal: 2,
    golesVisitante: 1,
    goles: [
      { id: 1, equipoId: 1, minuto: 80, esPenal: true, jugador: { id: 4, nombre: "Lamine Yamal" } },
      { id: 2, equipoId: 1, minuto: 12, esPenal: false, jugador: { id: 4, nombre: "Lamine Yamal" } },
      { id: 3, equipoId: 2, minuto: null, esPenal: false, jugador: null },
    ],
    ...datos,
  };
}

function renderPartido(props: Omit<React.ComponentProps<typeof TarjetaPartido>, "partido"> & { partido: PartidoDTO }) {
  return render(
    <ul>
      <TarjetaPartido {...props} />
    </ul>,
  );
}

describe("TablaPosiciones", () => {
  const filas = [
    posicion({ equipo: ESPANA, pj: 2, pg: 1, pe: 1, gf: 2, gc: 1, dg: 1, puntos: 4 }),
    posicion({ equipo: PERU, pj: 2, pp: 2, gf: 1, gc: 4, dg: -3 }),
  ];

  it("muestra una fila por equipo, en el orden recibido, con enlace a la selección", () => {
    render(<TablaPosiciones grupo="A" filas={filas} />);

    const tabla = screen.getByRole("table", { name: "Posiciones del grupo A" });
    const [, primera, segunda] = within(tabla).getAllByRole("row");

    expect(within(primera).getByRole("link", { name: "España" })).toHaveAttribute("href", "/equipos/1");
    expect(within(primera).getAllByRole("cell").map((c) => c.textContent)).toEqual([
      "1", "2", "1", "1", "0", "2", "1", "+1", "4",
    ]);
    expect(within(segunda).getByRole("rowheader")).toHaveTextContent("Perú");
    // Diferencia negativa con el signo menos tipográfico.
    expect(within(segunda).getByText("−3")).toBeInTheDocument();
  });

  it("explica las siglas de las columnas", () => {
    render(<TablaPosiciones grupo="A" filas={filas} />);

    expect(screen.getByTitle("Diferencia de goles")).toHaveTextContent("DG");
    expect(screen.getByTitle("Puntos")).toHaveTextContent("Pts");
  });

  it("resalta la fila de la selección que se está consultando", () => {
    render(<TablaPosiciones grupo="A" filas={filas} equipoActualId={2} />);

    const [, primera, segunda] = screen.getAllByRole("row");
    expect(primera).not.toHaveAttribute("aria-current");
    expect(segunda).toHaveAttribute("aria-current", "true");
  });
});

describe("TarjetaPartido", () => {
  it("muestra la fecha, el marcador y los equipos enlazados", () => {
    renderPartido({ partido: partido() });

    expect(screen.getByText(/11 jun.? 2026 · 18:00 UTC/)).toBeInTheDocument();
    expect(screen.getByText("2 - 1")).toBeInTheDocument();
    // Los lectores de pantalla reciben el marcador con el nombre de cada equipo.
    expect(screen.getByText("España 2, Perú 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "España" })).toHaveAttribute("href", "/equipos/1");
    expect(screen.getByRole("link", { name: "Perú" })).toHaveAttribute("href", "/equipos/2");
  });

  it("lista los goles de cada equipo por minuto y resume los que no tienen goleador", () => {
    renderPartido({ partido: partido() });

    const locales = within(screen.getByRole("list", { name: "Goles de España" })).getAllByRole("listitem");
    expect(locales.map((li) => li.textContent)).toEqual([
      "Lamine Yamal 12′",
      "Lamine Yamal 80′ (penal)",
    ]);
    expect(within(locales[0]).getByRole("link")).toHaveAttribute("href", "/jugadores/4");
    expect(screen.getByRole("list", { name: "Goles de Perú" })).toHaveTextContent(
      "1 gol sin goleador registrado",
    );
  });

  it("un partido por jugar muestra «Por jugar» y ningún gol", () => {
    renderPartido({
      partido: partido({ jugado: false, fecha: null, golesLocal: 0, golesVisitante: 0, goles: [] }),
    });

    expect(screen.getByText("Por jugar")).toBeInTheDocument();
    expect(screen.getByText("Fecha por definir")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /Goles de/ })).toBeNull();
  });

  it("un 0-0 jugado muestra el marcador, no «Por jugar»", () => {
    renderPartido({ partido: partido({ golesLocal: 0, golesVisitante: 0, goles: [] }) });

    expect(screen.getByText("0 - 0")).toBeInTheDocument();
    expect(screen.queryByText("Por jugar")).toBeNull();
  });

  it("en la página de una selección añade su resultado, la fase y no la enlaza a sí misma", () => {
    renderPartido({ partido: partido(), mostrarFase: true, equipoActualId: 2 });

    expect(screen.getByText("Derrota")).toBeInTheDocument();
    expect(screen.getByText("Grupos")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Perú" })).toBeNull();
    expect(screen.getByRole("link", { name: "España" })).toBeInTheDocument();
  });

  it("sin selección de referencia no muestra resultado ni fase", () => {
    renderPartido({ partido: partido() });

    expect(screen.queryByText(/Victoria|Derrota|Empate/)).toBeNull();
    expect(screen.queryByText("Grupos")).toBeNull();
  });
});
