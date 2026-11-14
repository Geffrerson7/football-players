import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import Navbar from "@/components/Navbar";

vi.mock("next/navigation", () => ({ usePathname: () => "/jugadores" }));
vi.mock("@/app/login/actions", () => ({ cerrarSesion: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));

// H-08: Equipos y Partidos ya existen (fase 6); la navegación y la portada los enlazan.
describe("navegación a todas las secciones (H-08)", () => {
  it("la navegación enlaza las cuatro secciones y marca la actual", () => {
    render(<Navbar usuario={{ nombre: "Ana", rol: "admin" }} />);
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });

    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/",
      "/jugadores",
      "/equipos",
      "/partidos",
    ]);
    expect(within(nav).getByRole("link", { name: "Jugadores" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Equipos" })).not.toHaveAttribute("aria-current");
    expect(within(nav).queryByText("Próximamente")).toBeNull();
  });

  it("sin sesión, la cabecera no muestra navegación", () => {
    render(<Navbar usuario={null} />);

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("button", { name: /Cerrar sesión/ })).toBeNull();
  });

  it("la portada enlaza a Jugadores, Equipos y Partidos", () => {
    render(<Home />);

    const enlaces = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(enlaces).toEqual(expect.arrayContaining(["/jugadores", "/equipos", "/partidos"]));
    expect(screen.queryByText("Próximamente")).toBeNull();
    expect(screen.getByRole("link", { name: /Ver equipos/ })).toHaveAttribute("href", "/equipos");
    expect(screen.getByRole("link", { name: /Explorar partidos/ })).toHaveAttribute(
      "href",
      "/partidos",
    );
  });
});
