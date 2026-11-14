import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayersTable from "@/components/jugadores/PlayersTable";
import { jugador, plantel } from "./fixtures";

// Vista de tarjetas (H-26): se simula una pantalla de menos de 640 px.
const matchMediaOriginal = window.matchMedia;

beforeEach(() => {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("max-width: 639.98px"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
});

afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

describe("PlayersTable en móvil", () => {
  it("muestra tarjetas en lugar de la tabla", () => {
    render(<PlayersTable jugadores={plantel(3)} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    expect(screen.queryByRole("grid")).toBeNull();
    const lista = screen.getByRole("list", { name: "Jugadores del plantel" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(3);
  });

  it("cada tarjeta muestra los mismos datos que la fila de la tabla", () => {
    const jugadores = [
      jugador({ id: 1, nombre: "Lamine Yamal", dorsal: 7, posicion: "Delantero" }),
      jugador({
        id: 2,
        nombre: "Pepe",
        dorsal: 3,
        posicion: null,
        activo: false,
        fechaNacimiento: "1990-02-07",
      }),
    ];
    render(<PlayersTable jugadores={jugadores} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    const [primera, segunda] = screen.getAllByRole("listitem");
    expect(within(primera).getByLabelText("Dorsal 7")).toHaveTextContent("07");
    expect(within(primera).getByRole("link", { name: "Lamine Yamal" })).toHaveAttribute(
      "href",
      "/jugadores/1",
    );
    expect(within(primera).getByText("Delantero")).toBeInTheDocument();
    expect(within(primera).getByText("Activo")).toBeInTheDocument();

    expect(within(segunda).getByText("Sin posición")).toBeInTheDocument();
    expect(within(segunda).getByText("Inactivo")).toBeInTheDocument();
    expect(within(segunda).getByText("Fuera de convocatoria")).toBeInTheDocument();
    expect(within(segunda).getByText(/^7 feb\.? 1990$/)).toBeInTheDocument();
  });

  it("avisa al padre al pulsar Editar o Eliminar", async () => {
    const user = userEvent.setup();
    const onEditar = vi.fn();
    const onEliminar = vi.fn();
    const yamal = jugador({ id: 1, nombre: "Lamine Yamal" });
    render(<PlayersTable jugadores={[yamal]} onEditar={onEditar} onEliminar={onEliminar} />);

    await user.click(screen.getByRole("button", { name: "Editar a Lamine Yamal" }));
    await user.click(screen.getByRole("button", { name: "Eliminar a Lamine Yamal" }));

    expect(onEditar).toHaveBeenCalledWith(yamal);
    expect(onEliminar).toHaveBeenCalledWith(yamal);
  });

  it("conserva la paginación", async () => {
    const user = userEvent.setup();
    render(<PlayersTable jugadores={plantel(12)} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Mostrando 11–12 de 12 jugadores")).toBeInTheDocument();
  });
});
