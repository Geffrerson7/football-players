import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlayersView from "@/components/jugadores/PlayersView";
import { jugador, plantel } from "./fixtures";

vi.mock("@/app/jugadores/actions", () => ({
  crearJugador: vi.fn(),
  actualizarJugador: vi.fn(),
  eliminarJugador: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const filtro = (nombre: string) =>
  within(screen.getByRole("group", { name: "Filtrar jugadores por posición" })).getByRole(
    "button",
    { name: nombre },
  );

describe("PlayersView", () => {
  it("muestra el total y un filtro por cada posición presente", () => {
    render(<PlayersView jugadores={plantel(12)} />);

    // Texto exacto de la banda (el contador de la tabla dice «… de 12 jugadores»).
    expect(screen.getByText("12 jugadores")).toBeInTheDocument();
    const grupo = screen.getByRole("group", { name: "Filtrar jugadores por posición" });
    expect(grupo).toHaveTextContent("Todos");
    // Solo aparecen las posiciones que existen, ordenadas alfabéticamente.
    expect([...grupo.querySelectorAll("button")].map((b) => b.textContent)).toEqual([
      "Todos",
      "Defensa",
      "Delantero",
      "Mediocampista",
      "Portero",
    ]);
  });

  it("filtra por posición y marca el filtro activo (H-01)", async () => {
    const user = userEvent.setup();
    render(<PlayersView jugadores={plantel(12)} />);

    await user.click(filtro("Defensa"));

    expect(filtro("Defensa")).toHaveAttribute("aria-pressed", "true");
    expect(filtro("Defensa")).toHaveClass("bg-(--pl-ink)");
    expect(filtro("Todos")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Mostrando 1–3 de 3 jugadores")).toBeInTheDocument();
  });

  it("vuelve a la primera página al cambiar de filtro (H-03)", async () => {
    const user = userEvent.setup();
    render(<PlayersView jugadores={plantel(30)} />);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    await user.click(filtro("Delantero"));

    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay jugadores", () => {
    render(<PlayersView jugadores={[]} />);

    expect(screen.getByText("El plantel está vacío.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filtrar jugadores por posición" })).toBeNull();
  });

  it("al cancelar una edición se descartan los cambios (H-04)", async () => {
    const user = userEvent.setup();
    render(<PlayersView jugadores={[jugador({ id: 4, nombre: "Lamine Yamal" })]} />);

    await user.click(screen.getByRole("button", { name: "Editar a Lamine Yamal" }));
    const nombre = await screen.findByRole("textbox", { name: "Nombre" });
    await user.clear(nombre);
    await user.type(nombre, "Nombre sin guardar");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await user.click(screen.getByRole("button", { name: "Editar a Lamine Yamal" }));

    expect(await screen.findByRole("textbox", { name: "Nombre" })).toHaveValue("Lamine Yamal");
  });
});
