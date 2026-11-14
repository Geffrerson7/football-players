import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import Navbar from "@/components/Navbar";

vi.mock("next/navigation", () => ({ usePathname: () => "/jugadores" }));
vi.mock("@/app/login/actions", () => ({ cerrarSesion: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));

// H-08: Equipos y Partidos aún no existen; no deben enlazar a una página 404.
describe("secciones pendientes (H-08)", () => {
  it("la navegación enlaza solo las secciones que existen y marca la actual", () => {
    render(<Navbar usuario={{ nombre: "Ana", rol: "admin" }} />);
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });

    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/",
      "/jugadores",
    ]);
    expect(within(nav).getByRole("link", { name: "Jugadores" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByText("Equipos")).toHaveTextContent("Próximamente");
    expect(within(nav).getByText("Partidos")).toHaveTextContent("Próximamente");
  });

  it("sin sesión, la cabecera no muestra navegación", () => {
    render(<Navbar usuario={null} />);

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("button", { name: /Cerrar sesión/ })).toBeNull();
  });

  it("la portada solo enlaza a Jugadores y anuncia las otras dos secciones", () => {
    render(<Home />);

    const enlaces = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(enlaces).not.toContain("/equipos");
    expect(enlaces).not.toContain("/partidos");
    expect(enlaces).toContain("/jugadores");
    expect(screen.getAllByText("Próximamente")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Equipos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Partidos" })).toBeInTheDocument();
  });
});
