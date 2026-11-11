import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { actualizarJugador, crearJugador } from "@/app/jugadores/actions";
import PlayerFormModal from "@/components/jugadores/PlayerFormModal";
import type { JugadorDTO } from "@/lib/jugadores";
import { jugador } from "./fixtures";

vi.mock("@/app/jugadores/actions", () => ({
  crearJugador: vi.fn(),
  actualizarJugador: vi.fn(),
  eliminarJugador: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const yamal = jugador({
  id: 4,
  nombre: "Lamine Yamal",
  posicion: "Delantero",
  dorsal: 19,
  activo: true,
  fechaNacimiento: "2007-07-13",
});

function renderModal(jugadorEditado: JugadorDTO | null) {
  const onOpenChange = vi.fn();
  const onGuardado = vi.fn();
  render(
    <PlayerFormModal
      jugador={jugadorEditado}
      isOpen
      onOpenChange={onOpenChange}
      onGuardado={onGuardado}
    />,
  );
  return { onOpenChange, onGuardado, user: userEvent.setup() };
}

const campo = (nombre: string) => screen.getByRole("textbox", { name: nombre });
const dorsal = () => screen.getByRole("spinbutton", { name: "Dorsal" });
const fecha = () => screen.getByLabelText("Fecha de nacimiento");

function ultimoFormData(mock: ReturnType<typeof vi.fn>) {
  const formData = mock.mock.calls.at(-1)?.at(-1) as FormData;
  return Object.fromEntries(formData.entries());
}

describe("PlayerFormModal en modo creación", () => {
  it("muestra el formulario vacío y sin el interruptor de estado", () => {
    renderModal(null);

    expect(screen.getByRole("heading", { name: "Registrar jugador" })).toBeInTheDocument();
    expect(campo("Nombre")).toHaveValue("");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("no llama al servidor si el dorsal está fuera de rango", async () => {
    const { user } = renderModal(null);

    await user.type(campo("Nombre"), "Pedri");
    await user.type(dorsal(), "150");
    await user.click(screen.getByRole("button", { name: "Registrar jugador" }));

    expect(await screen.findByText("Ingresa un dorsal entre 1 y 99.")).toBeInTheDocument();
    expect(crearJugador).not.toHaveBeenCalled();
  });

  it("envía el formulario completo, notifica y cierra", async () => {
    vi.mocked(crearJugador).mockResolvedValue({
      ok: true,
      datos: jugador({ id: 20, nombre: "Pedri", posicion: "Mediocampista", dorsal: 8 }),
    });
    const { user, onOpenChange, onGuardado } = renderModal(null);

    await user.type(campo("Nombre"), "Pedri");
    await user.click(screen.getByRole("button", { name: /Posición/ }));
    await user.click(await screen.findByRole("option", { name: "Mediocampista" }));
    await user.type(dorsal(), "8");
    await user.type(fecha(), "2002-11-25");
    await user.click(screen.getByRole("button", { name: "Registrar jugador" }));

    expect(crearJugador).toHaveBeenCalledTimes(1);
    expect(ultimoFormData(vi.mocked(crearJugador))).toMatchObject({
      nombre: "Pedri",
      posicion: "Mediocampista",
      dorsal: "8",
      fechaNacimiento: "2002-11-25",
    });
    expect(toast.success).toHaveBeenCalledWith("Jugador registrado correctamente", expect.anything());
    expect(onGuardado).toHaveBeenCalledWith(expect.objectContaining({ id: 20 }), true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("PlayerFormModal en modo edición", () => {
  it("rellena los campos con los datos del jugador", () => {
    renderModal(yamal);

    expect(screen.getByRole("heading", { name: "Editar jugador" })).toBeInTheDocument();
    expect(campo("Nombre")).toHaveValue("Lamine Yamal");
    expect(dorsal()).toHaveValue(19);
    expect(fecha()).toHaveValue("2007-07-13");
    expect(screen.getByRole("switch", { name: "Activo" })).toBeChecked();
  });

  it("envía el id y los cambios, incluido el estado inactivo", async () => {
    vi.mocked(actualizarJugador).mockResolvedValue({
      ok: true,
      datos: { ...yamal, nombre: "Lamine Yamal Nasraoui", activo: false },
    });
    const { user, onGuardado } = renderModal(yamal);

    await user.clear(campo("Nombre"));
    await user.type(campo("Nombre"), "Lamine Yamal Nasraoui");
    await user.click(screen.getByRole("switch", { name: "Activo" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(actualizarJugador).toHaveBeenCalledWith(4, expect.any(FormData));
    const enviado = ultimoFormData(vi.mocked(actualizarJugador));
    expect(enviado).toMatchObject({ nombre: "Lamine Yamal Nasraoui", posicion: "Delantero" });
    expect(enviado).not.toHaveProperty("activo");
    expect(onGuardado).toHaveBeenCalledWith(expect.objectContaining({ activo: false }), false);
  });

  it("muestra los errores por campo que devuelve el servidor", async () => {
    vi.mocked(actualizarJugador).mockResolvedValue({
      ok: false,
      error: "Revisa los datos del formulario.",
      campos: { nombre: "El nombre no puede superar los 255 caracteres." },
    });
    const { user, onOpenChange } = renderModal(yamal);

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("El nombre no puede superar los 255 caracteres."),
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("No se pudo actualizar al jugador", {
      description: "Revisa los datos del formulario.",
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("ofrece las cuatro posiciones", async () => {
    const { user } = renderModal(yamal);

    await user.click(screen.getByRole("button", { name: /Posición/ }));
    const opciones = within(await screen.findByRole("listbox")).getAllByRole("option");

    expect(opciones.map((o) => o.textContent)).toEqual([
      "Portero",
      "Defensa",
      "Mediocampista",
      "Delantero",
    ]);
  });
});
