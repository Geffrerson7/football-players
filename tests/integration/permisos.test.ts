import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { actualizarJugador, crearJugador, eliminarJugador } from "@/app/jugadores/actions";
import { obtenerJugadorConDetalle, obtenerJugadores } from "@/app/jugadores/data";
import { prisma } from "@/lib/prisma";
import { MENSAJE_SIN_PERMISOS, MENSAJE_SIN_SESION } from "@/lib/roles";
import { cookieDe, usarSesion } from "./sesion-pruebas";

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

const VALIDO = {
  nombre: "Lamine Yamal",
  posicion: "Delantero",
  dorsal: "19",
  fechaNacimiento: "2007-07-13",
};

const PEDRI = {
  nombre: "Pedri",
  posicion: "Mediocampista",
  dorsal: 8,
  activo: true,
  fechaNacimiento: new Date("2002-11-25T00:00:00Z"),
};

/** Las tres Server Actions, cada una sobre el jugador existente `id`. */
const ACCIONES = [
  { nombre: "crearJugador", ejecutar: () => crearJugador(formulario(VALIDO)) },
  {
    nombre: "actualizarJugador",
    ejecutar: (id: number) => actualizarJugador(id, formulario({ ...VALIDO, activo: "on" })),
  },
  { nombre: "eliminarJugador", ejecutar: (id: number) => eliminarJugador(id) },
];

async function estadoDeLaBase() {
  return prisma.jugador.findMany({ orderBy: { id: "asc" } });
}

describe.each(ACCIONES)("$nombre: control de acceso", ({ ejecutar }) => {
  let id: number;
  let antes: Awaited<ReturnType<typeof estadoDeLaBase>>;

  beforeEach(async () => {
    id = (await prisma.jugador.create({ data: PEDRI })).id;
    antes = await estadoDeLaBase();
    vi.mocked(revalidatePath).mockClear();
  });

  it("se rechaza sin sesión y la base de datos no cambia", async () => {
    usarSesion(null);

    expect(await ejecutar(id)).toEqual({ ok: false, error: MENSAJE_SIN_SESION });
    expect(await estadoDeLaBase()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("se rechaza con una cookie de sesión falsificada", async () => {
    // Mismo nombre de cookie, token inventado y firma inválida.
    const [nombre] = cookieDe("admin").split("=");
    usarSesion({ cookie: `${nombre}=token-inventado.firma-invalida` });

    expect(await ejecutar(id)).toEqual({ ok: false, error: MENSAJE_SIN_SESION });
    expect(await estadoDeLaBase()).toEqual(antes);
  });

  it("se rechaza con el rol demo, con el mensaje de permisos, y la base de datos no cambia", async () => {
    usarSesion("demo");

    expect(await ejecutar(id)).toEqual({ ok: false, error: MENSAJE_SIN_PERMISOS });
    expect(await estadoDeLaBase()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("se permite con el rol admin", async () => {
    usarSesion("admin");

    const resultado = await ejecutar(id);

    expect(resultado.ok).toBe(true);
    expect(await estadoDeLaBase()).not.toEqual(antes);
  });
});

describe("control de acceso: casos límite", () => {
  it("el rol demo se rechaza antes de validar los datos (no revela errores de validación)", async () => {
    usarSesion("demo");

    const resultado = await crearJugador(formulario({ nombre: "", dorsal: "999" }));

    expect(resultado).toEqual({ ok: false, error: MENSAJE_SIN_PERMISOS });
  });

  it("una sesión cerrada deja de ser válida de inmediato", async () => {
    const { obtenerAuth } = await import("@/lib/auth");
    const { USUARIOS, cookieDesde } = await import("./sesion-pruebas");
    const { headers } = await obtenerAuth().api.signInEmail({
      body: { email: USUARIOS.admin.email, password: USUARIOS.admin.password },
      returnHeaders: true,
    });
    const cookie = cookieDesde(headers);
    usarSesion({ cookie });
    expect((await crearJugador(formulario(VALIDO))).ok).toBe(true);

    await obtenerAuth().api.signOut({ headers: new Headers({ cookie }) });

    expect(await crearJugador(formulario(VALIDO))).toEqual({ ok: false, error: MENSAJE_SIN_SESION });
  });

  it("si un administrador pasa a ser demo, pierde el permiso de escritura de inmediato", async () => {
    const { USUARIOS } = await import("./sesion-pruebas");
    usarSesion("admin");
    await prisma.user.update({ where: { email: USUARIOS.admin.email }, data: { role: "demo" } });

    try {
      expect(await crearJugador(formulario(VALIDO))).toEqual({
        ok: false,
        error: MENSAJE_SIN_PERMISOS,
      });
    } finally {
      await prisma.user.update({ where: { email: USUARIOS.admin.email }, data: { role: "admin" } });
    }
  });

  it("la base de datos no admite roles desconocidos", async () => {
    const { USUARIOS } = await import("./sesion-pruebas");
    await expect(
      prisma.user.update({ where: { email: USUARIOS.demo.email }, data: { role: "superadmin" } }),
    ).rejects.toThrow();
  });
});

describe("consultas: lectura", () => {
  beforeEach(async () => {
    await prisma.jugador.create({ data: PEDRI });
  });

  it("el rol demo puede leer el listado y el perfil", async () => {
    usarSesion("demo");

    const jugadores = await obtenerJugadores();

    expect(jugadores).toHaveLength(1);
    expect((await obtenerJugadorConDetalle(jugadores[0].id))?.jugador.nombre).toBe("Pedri");
  });

  it("sin sesión, las consultas redirigen al inicio de sesión sin devolver datos", async () => {
    usarSesion(null);

    await expect(obtenerJugadores()).rejects.toThrow("REDIRECT:/login");
    await expect(obtenerJugadorConDetalle(1)).rejects.toThrow("REDIRECT:/login");
  });
});
