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

  describe("búsqueda por nombre", () => {
    const jugadores = [
      jugador({ id: 1, nombre: "Lionel Messi", posicion: "Delantero" }),
      jugador({ id: 2, nombre: "Ángel Di María", posicion: "Delantero" }),
      jugador({ id: 3, nombre: "Emiliano Martínez", posicion: "Portero" }),
    ];
    const buscador = () => screen.getByRole("searchbox", { name: "Buscar por nombre" });
    const nombresVisibles = () =>
      screen.getAllByRole("link").map((enlace) => enlace.textContent);

    it("filtra mientras se escribe, sin distinguir mayúsculas ni tildes", async () => {
      const user = userEvent.setup();
      render(<PlayersView jugadores={jugadores} />);

      await user.type(buscador(), "MARIA");

      expect(nombresVisibles()).toEqual(["Ángel Di María"]);
      expect(screen.getByRole("status")).toHaveTextContent("1 de 3 jugadores");
      // La banda sigue mostrando el total del plantel.
      expect(screen.getByText("3 jugadores")).toBeInTheDocument();
    });

    it("se combina con el filtro por posición", async () => {
      const user = userEvent.setup();
      render(<PlayersView jugadores={jugadores} />);

      await user.type(buscador(), "mar");
      expect(nombresVisibles()).toEqual(["Ángel Di María", "Emiliano Martínez"]);

      await user.click(filtro("Portero"));

      expect(nombresVisibles()).toEqual(["Emiliano Martínez"]);
    });

    it("sin coincidencias muestra el texto buscado y permite quitar los filtros", async () => {
      const user = userEvent.setup();
      render(<PlayersView jugadores={jugadores} />);

      await user.click(filtro("Portero"));
      await user.type(buscador(), "ronaldo");

      expect(screen.getByText("Ningún jugador coincide con «ronaldo».")).toBeInTheDocument();
      expect(screen.queryByRole("link")).toBeNull();

      await user.click(screen.getByRole("button", { name: "Ver todos los jugadores" }));

      expect(buscador()).toHaveValue("");
      expect(filtro("Todos")).toHaveAttribute("aria-pressed", "true");
      expect(nombresVisibles()).toHaveLength(3);
    });

    it("el botón de borrar vacía la búsqueda", async () => {
      const user = userEvent.setup();
      render(<PlayersView jugadores={jugadores} />);

      await user.type(buscador(), "messi");
      await user.click(screen.getByRole("button", { name: "Borrar la búsqueda" }));

      expect(buscador()).toHaveValue("");
      expect(nombresVisibles()).toHaveLength(3);
    });

    it("vuelve a la primera página al buscar", async () => {
      const user = userEvent.setup();
      render(<PlayersView jugadores={plantel(30)} />);

      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      expect(screen.getByText("2 / 3")).toBeInTheDocument();

      await user.type(buscador(), "jugador 1");

      // Cada palabra se busca por separado: «Jugador 1», «Jugador 10» a «Jugador 19» y «Jugador 21».
      expect(screen.getByText("Mostrando 1–10 de 12 jugadores")).toBeInTheDocument();
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
    });

    it("no se muestra si el plantel está vacío", () => {
      render(<PlayersView jugadores={[]} />);

      expect(screen.queryByRole("searchbox")).toBeNull();
    });
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
