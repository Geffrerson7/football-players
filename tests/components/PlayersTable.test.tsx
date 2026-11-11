import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlayersTable from "@/components/jugadores/PlayersTable";
import { jugador, plantel } from "./fixtures";

function filasDeDatos() {
  // La primera fila es la cabecera.
  return screen.getAllByRole("row").slice(1);
}

function renderTabla(jugadores = plantel(12)) {
  const onEditar = vi.fn();
  const onEliminar = vi.fn();
  const utils = render(
    <PlayersTable jugadores={jugadores} onEditar={onEditar} onEliminar={onEliminar} />,
  );
  return { ...utils, onEditar, onEliminar, user: userEvent.setup() };
}

describe("PlayersTable", () => {
  it("muestra 10 jugadores por página", () => {
    renderTabla();

    expect(filasDeDatos()).toHaveLength(10);
    expect(screen.getByText("Mostrando 1–10 de 12 jugadores")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  });

  it("navega entre páginas", async () => {
    const { user } = renderTabla();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(filasDeDatos()).toHaveLength(2);
    expect(screen.getByText("Mostrando 11–12 de 12 jugadores")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("no se queda en una página inexistente si la lista se reduce (H-03)", async () => {
    const { user, rerender, onEditar, onEliminar } = renderTabla(plantel(30));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    // La lista pasa a tener 2 páginas: la página 3 deja de existir.
    rerender(<PlayersTable jugadores={plantel(15)} onEditar={onEditar} onEliminar={onEliminar} />);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(filasDeDatos()).toHaveLength(5);

    // Con el bug original, «Anterior» pasaba de 3 a 2 (recortado a 2) y no se movía.
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("muestra dorsal con dos cifras, estado y enlace al perfil", () => {
    renderTabla([
      jugador({ id: 4, nombre: "Lamine Yamal", dorsal: 7, activo: true }),
      jugador({ id: 9, nombre: "Lapadula", dorsal: 9, activo: false, fechaNacimiento: "1990-02-07" }),
    ]);

    const [primera, segunda] = filasDeDatos();
    expect(within(primera).getByText("07")).toBeInTheDocument();
    expect(within(primera).getByText("Activo")).toBeInTheDocument();
    expect(within(primera).getByRole("link", { name: "Lamine Yamal" })).toHaveAttribute(
      "href",
      "/jugadores/4",
    );
    expect(within(segunda).getByText("Inactivo")).toBeInTheDocument();
    expect(within(segunda).getByText("Fuera de convocatoria")).toBeInTheDocument();
    expect(within(segunda).getByText(/^7 feb\.? 1990$/)).toBeInTheDocument();
  });

  it("avisa al padre al pulsar Editar o Eliminar", async () => {
    const yamal = jugador({ id: 4, nombre: "Lamine Yamal" });
    const { user, onEditar, onEliminar } = renderTabla([yamal]);

    await user.click(screen.getByRole("button", { name: "Editar a Lamine Yamal" }));
    await user.click(screen.getByRole("button", { name: "Eliminar a Lamine Yamal" }));

    expect(onEditar).toHaveBeenCalledWith(yamal);
    expect(onEliminar).toHaveBeenCalledWith(yamal);
  });
});
