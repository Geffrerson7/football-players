import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { eliminarJugador } from "@/app/jugadores/actions";
import DeletePlayerModal from "@/components/jugadores/DeletePlayerModal";
import { MENSAJE_SIN_PERMISOS } from "@/lib/roles";
import { jugador } from "./fixtures";

vi.mock("@/app/jugadores/actions", () => ({
  crearJugador: vi.fn(),
  actualizarJugador: vi.fn(),
  eliminarJugador: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const messi = jugador({ id: 1, nombre: "Lionel Messi", dorsal: 10 });

function renderModal() {
  const onOpenChange = vi.fn();
  render(<DeletePlayerModal jugador={messi} isOpen onOpenChange={onOpenChange} />);
  return { onOpenChange, user: userEvent.setup() };
}

describe("DeletePlayerModal", () => {
  it("muestra el jugador que se va a eliminar", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Eliminar jugador" })).toBeInTheDocument();
    expect(screen.getByText("Lionel Messi")).toBeInTheDocument();
    expect(screen.getByText("Dorsal #10")).toBeInTheDocument();
  });

  it("elimina, notifica y cierra el modal", async () => {
    vi.mocked(eliminarJugador).mockResolvedValue({ ok: true, datos: { id: 1 } });
    const { user, onOpenChange } = renderModal();

    await user.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    expect(eliminarJugador).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith("Jugador eliminado correctamente.", expect.anything());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("muestra el motivo del error en el modal y en una notificación (H-02)", async () => {
    const error = "No se puede eliminar: el jugador tiene goles registrados en partidos.";
    vi.mocked(eliminarJugador).mockResolvedValue({ ok: false, error });
    const { user, onOpenChange } = renderModal();

    await user.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(error);
    expect(toast.error).toHaveBeenCalledWith("No se pudo eliminar al jugador", {
      description: error,
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("muestra el mensaje de falta de permisos si el servidor rechaza al usuario demo", async () => {
    vi.mocked(eliminarJugador).mockResolvedValue({ ok: false, error: MENSAJE_SIN_PERMISOS });
    const { user, onOpenChange } = renderModal();

    // El botón sigue disponible para el demo: quien decide es el servidor.
    await user.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El usuario demo no tiene permisos para modificar datos.",
    );
    expect(toast.error).toHaveBeenCalledWith("No se pudo eliminar al jugador", {
      description: MENSAJE_SIN_PERMISOS,
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("cancela sin llamar al servidor", async () => {
    const { user, onOpenChange } = renderModal();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(eliminarJugador).not.toHaveBeenCalled();
  });
});
