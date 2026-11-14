import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { entrarComoDemo, iniciarSesion } from "@/app/login/actions";
import LoginForm from "@/components/login/LoginForm";

vi.mock("@/app/login/actions", () => ({
  iniciarSesion: vi.fn(),
  entrarComoDemo: vi.fn(),
  cerrarSesion: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(iniciarSesion).mockReset();
  vi.mocked(entrarComoDemo).mockReset();
});

describe("LoginForm", () => {
  it("envía el correo y la contraseña al servidor", async () => {
    vi.mocked(iniciarSesion).mockResolvedValue(null);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/Correo electrónico/), "admin@ejemplo.com");
    await user.type(screen.getByLabelText(/Contraseña/), "una-clave-larga");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await vi.waitFor(() => expect(iniciarSesion).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(iniciarSesion).mock.calls[0][1];
    expect(Object.fromEntries(formData.entries())).toEqual({
      email: "admin@ejemplo.com",
      password: "una-clave-larga",
    });
    expect(entrarComoDemo).not.toHaveBeenCalled();
  });

  it("muestra el error que devuelve el servidor", async () => {
    vi.mocked(iniciarSesion).mockResolvedValue({ error: "Correo o contraseña incorrectos." });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/Correo electrónico/), "admin@ejemplo.com");
    await user.type(screen.getByLabelText(/Contraseña/), "clave-equivocada");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.");
  });

  it("«Entrar como demo» inicia la sesión en el servidor sin enviar credenciales", async () => {
    vi.mocked(entrarComoDemo).mockResolvedValue(null);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "Entrar como demo" }));

    await vi.waitFor(() => expect(entrarComoDemo).toHaveBeenCalledTimes(1));
    // El formulario demo no tiene campos: las credenciales solo existen en el servidor.
    const formData = vi.mocked(entrarComoDemo).mock.calls[0].at(-1) as unknown as FormData;
    expect([...formData.keys()]).toEqual([]);
    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  it("muestra el error si el acceso demo falla", async () => {
    vi.mocked(entrarComoDemo).mockResolvedValue({
      error: "El acceso demo no está configurado en este entorno.",
    });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "Entrar como demo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El acceso demo no está configurado en este entorno.",
    );
  });
});
