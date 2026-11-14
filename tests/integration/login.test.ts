import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cerrarSesion, entrarComoDemo, iniciarSesion } from "@/app/login/actions";
import { reiniciarIntentos } from "@/lib/limite-intentos";
import { prisma } from "@/lib/prisma";
import { proxy } from "@/proxy";
import { USUARIOS, cookieDe, usarSesion } from "./sesion-pruebas";

function credenciales(email: string, password: string) {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

/** Rol del usuario de la sesión más reciente. */
async function rolDeLaUltimaSesion() {
  const sesion = await prisma.session.findFirst({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
  return sesion?.user.role;
}

beforeEach(() => {
  usarSesion(null);
  reiniciarIntentos();
});

describe("iniciarSesion", () => {
  it("con credenciales válidas crea la sesión y redirige al inicio", async () => {
    const antes = await prisma.session.count();

    await expect(
      iniciarSesion(null, credenciales(USUARIOS.admin.email, USUARIOS.admin.password)),
    ).rejects.toThrow("REDIRECT:/");

    expect(await prisma.session.count()).toBe(antes + 1);
    expect(await rolDeLaUltimaSesion()).toBe("admin");
  });

  it("acepta el correo con mayúsculas y espacios", async () => {
    await expect(
      iniciarSesion(null, credenciales("  ADMIN@Pruebas.Test ", USUARIOS.admin.password)),
    ).rejects.toThrow("REDIRECT:/");
  });

  it.each([
    ["contraseña incorrecta", USUARIOS.admin.email, "no-es-la-clave"],
    ["usuario inexistente", "nadie@pruebas.test", "cualquier-clave"],
  ])("con %s devuelve el mismo error genérico y no crea sesión", async (_caso, email, password) => {
    const antes = await prisma.session.count();

    expect(await iniciarSesion(null, credenciales(email, password))).toEqual({
      error: "Correo o contraseña incorrectos.",
    });
    expect(await prisma.session.count()).toBe(antes);
  });

  it("pide los dos campos", async () => {
    expect(await iniciarSesion(null, credenciales("", ""))).toEqual({
      error: "Ingresa tu correo y tu contraseña.",
    });
  });

  it("bloquea tras cinco intentos en un minuto, incluso con la contraseña correcta", async () => {
    for (let i = 0; i < 5; i++) {
      await iniciarSesion(null, credenciales(USUARIOS.admin.email, "no-es-la-clave"));
    }

    expect(
      await iniciarSesion(null, credenciales(USUARIOS.admin.email, USUARIOS.admin.password)),
    ).toEqual({ error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." });
  });

  it("no existe registro público: no se pueden crear usuarios", async () => {
    const { obtenerAuth } = await import("@/lib/auth");
    const antes = await prisma.user.count();

    await expect(
      obtenerAuth().api.signUpEmail({
        body: { name: "Intruso", email: "intruso@pruebas.test", password: "clave-del-intruso" },
      }),
    ).rejects.toThrow();
    expect(await prisma.user.count()).toBe(antes);
  });
});

describe("entrarComoDemo", () => {
  afterEach(() => {
    delete process.env.DEMO_EMAIL;
    delete process.env.DEMO_PASSWORD;
  });

  it("inicia sesión con las credenciales del entorno, con el rol demo", async () => {
    process.env.DEMO_EMAIL = USUARIOS.demo.email;
    process.env.DEMO_PASSWORD = USUARIOS.demo.password;

    await expect(entrarComoDemo()).rejects.toThrow("REDIRECT:/");

    expect(await rolDeLaUltimaSesion()).toBe("demo");
  });

  it("avisa si el acceso demo no está configurado", async () => {
    expect(await entrarComoDemo()).toEqual({
      error: "El acceso demo no está configurado en este entorno.",
    });
  });

  it("no revela el motivo si las credenciales del entorno son incorrectas", async () => {
    process.env.DEMO_EMAIL = USUARIOS.demo.email;
    process.env.DEMO_PASSWORD = "clave-equivocada";
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});

    const resultado = await entrarComoDemo();

    expect(resultado).toEqual({ error: "No se pudo iniciar la sesión demo. Inténtalo más tarde." });
    expect(JSON.stringify(consola.mock.calls)).not.toContain("clave-equivocada");
    consola.mockRestore();
  });
});

describe("cerrarSesion", () => {
  it("elimina la sesión y redirige al inicio de sesión", async () => {
    const { obtenerAuth } = await import("@/lib/auth");
    const { cookieDesde } = await import("./sesion-pruebas");
    const { headers } = await obtenerAuth().api.signInEmail({
      body: { email: USUARIOS.demo.email, password: USUARIOS.demo.password },
      returnHeaders: true,
    });
    usarSesion({ cookie: cookieDesde(headers) });
    const antes = await prisma.session.count();

    await expect(cerrarSesion()).rejects.toThrow("REDIRECT:/login");

    expect(await prisma.session.count()).toBe(antes - 1);
  });

  it("sin sesión también redirige al inicio de sesión", async () => {
    await expect(cerrarSesion()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("proxy: inicio de sesión obligatorio", () => {
  function peticion(ruta: string, cookie?: string, metodo = "GET") {
    return new NextRequest(`http://localhost:3000${ruta}`, {
      method: metodo,
      headers: cookie ? { cookie } : {},
    });
  }

  const destino = (respuesta: Response) => respuesta.headers.get("location");
  const dejaPasar = (respuesta: Response) => respuesta.headers.get("x-middleware-next") === "1";

  it.each(["/", "/jugadores", "/jugadores/1", "/equipos", "/ruta-inexistente", "/api/auth/get-session"])(
    "sin sesión, %s redirige a /login",
    async (ruta) => {
      const respuesta = await proxy(peticion(ruta));

      expect(respuesta.status).toBe(307);
      expect(destino(respuesta)).toBe("http://localhost:3000/login");
    },
  );

  it("sin sesión, un POST corriente también redirige a /login", async () => {
    const respuesta = await proxy(peticion("/jugadores", undefined, "POST"));

    expect(destino(respuesta)).toBe("http://localhost:3000/login");
  });

  it("sin sesión, una Server Action no se redirige: llega a la acción, que la rechaza", async () => {
    // Redirigir un POST de Server Action dejaría la interfaz sin respuesta útil; el
    // rechazo lo hace la propia acción (ver permisos.test.ts).
    const solicitud = new NextRequest("http://localhost:3000/jugadores", {
      method: "POST",
      headers: { "next-action": "0123456789abcdef" },
    });

    expect(dejaPasar(await proxy(solicitud))).toBe(true);
  });

  it("la cabecera de Server Action no abre las páginas (GET) sin sesión", async () => {
    const solicitud = new NextRequest("http://localhost:3000/jugadores", {
      headers: { "next-action": "0123456789abcdef" },
    });

    expect(destino(await proxy(solicitud))).toBe("http://localhost:3000/login");
  });

  it("con una cookie falsificada redirige a /login", async () => {
    const [nombre] = cookieDe("admin").split("=");
    const respuesta = await proxy(peticion("/jugadores", `${nombre}=inventado.firma`));

    expect(destino(respuesta)).toBe("http://localhost:3000/login");
  });

  it("sin sesión, /login es accesible", async () => {
    expect(dejaPasar(await proxy(peticion("/login")))).toBe(true);
  });

  it.each(["admin", "demo"] as const)("con sesión de %s deja pasar a las páginas", async (rol) => {
    expect(dejaPasar(await proxy(peticion("/jugadores", cookieDe(rol))))).toBe(true);
  });

  it("con sesión, /login redirige al inicio", async () => {
    const respuesta = await proxy(peticion("/login", cookieDe("admin")));

    expect(destino(respuesta)).toBe("http://localhost:3000/");
  });
});
