import { revalidatePath } from "next/cache";
import { describe, expect, it } from "vitest";
import { actualizarJugador, crearJugador, eliminarJugador } from "@/app/jugadores/actions";
import { prisma } from "@/lib/prisma";

const VALIDO = {
  nombre: "Lamine Yamal",
  posicion: "Delantero",
  dorsal: "19",
  fechaNacimiento: "2007-07-13",
};

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

function insertarJugador(datos: Partial<{ nombre: string; dorsal: number; activo: boolean }> = {}) {
  return prisma.jugador.create({
    data: {
      nombre: datos.nombre ?? "Pedri",
      posicion: "Mediocampista",
      dorsal: datos.dorsal ?? 8,
      activo: datos.activo ?? true,
      fechaNacimiento: new Date("2002-11-25T00:00:00Z"),
    },
  });
}

/** Crea dos equipos, un partido y un gol del jugador indicado. */
async function registrarGol(jugadorId: number) {
  const [local, visitante] = await Promise.all([
    prisma.equipo.create({ data: { nombre: "España", confederacion: "UEFA", grupo: "A", rankingFifa: 1 } }),
    prisma.equipo.create({ data: { nombre: "Perú", confederacion: "CONMEBOL", grupo: "A", rankingFifa: 30 } }),
  ]);
  const partido = await prisma.partido.create({
    data: { localId: local.id, visitanteId: visitante.id, fase: "Grupos" },
  });
  return prisma.gol.create({ data: { partidoId: partido.id, jugadorId, minuto: 15 } });
}

describe("crearJugador", () => {
  it("registra un jugador válido y revalida el listado", async () => {
    const resultado = await crearJugador(formulario({ ...VALIDO, nombre: "  Lamine Yamal  " }));

    expect(resultado).toEqual({
      ok: true,
      datos: {
        id: expect.any(Number),
        nombre: "Lamine Yamal",
        posicion: "Delantero",
        dorsal: 19,
        activo: true,
        fechaNacimiento: "2007-07-13",
      },
    });
    const guardado = await prisma.jugador.findUniqueOrThrow({
      where: { id: resultado.ok ? resultado.datos.id : -1 },
    });
    expect(guardado.nombre).toBe("Lamine Yamal");
    expect(guardado.fechaNacimiento?.toISOString()).toBe("2007-07-13T00:00:00.000Z");
    expect(revalidatePath).toHaveBeenCalledWith("/jugadores");
  });

  it("siempre crea al jugador como activo, aunque el formulario diga lo contrario", async () => {
    const resultado = await crearJugador(formulario({ ...VALIDO, activo: "" }));
    expect(resultado.ok && resultado.datos.activo).toBe(true);
  });

  it("devuelve un error por campo y no inserta nada si los datos son inválidos", async () => {
    const resultado = await crearJugador(
      formulario({ nombre: "  ", posicion: "Utilero", dorsal: "150", fechaNacimiento: "2999-01-01" }),
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.campos).toEqual({
      nombre: "Ingresa el nombre.",
      posicion: "Selecciona una posición válida.",
      dorsal: "Ingresa un dorsal entre 1 y 99.",
      fechaNacimiento: "La fecha de nacimiento no puede ser futura ni anterior a 1900.",
    });
    expect(await prisma.jugador.count()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rechaza un formulario vacío", async () => {
    const resultado = await crearJugador(new FormData());
    expect(resultado.ok).toBe(false);
    expect(await prisma.jugador.count()).toBe(0);
  });
});

describe("actualizarJugador", () => {
  it("actualiza los datos y desactiva al jugador si el Switch no se envía", async () => {
    const jugador = await insertarJugador();

    const resultado = await actualizarJugador(
      jugador.id,
      formulario({ nombre: "Pedri González", posicion: "Delantero", dorsal: "20", fechaNacimiento: "2002-11-25" }),
    );

    expect(resultado).toEqual({
      ok: true,
      datos: {
        id: jugador.id,
        nombre: "Pedri González",
        posicion: "Delantero",
        dorsal: 20,
        activo: false,
        fechaNacimiento: "2002-11-25",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/jugadores");
    expect(revalidatePath).toHaveBeenCalledWith(`/jugadores/${jugador.id}`);
  });

  it("reactiva al jugador cuando el Switch está encendido", async () => {
    const jugador = await insertarJugador({ activo: false });
    const resultado = await actualizarJugador(jugador.id, formulario({ ...VALIDO, activo: "on" }));
    expect(resultado.ok && resultado.datos.activo).toBe(true);
  });

  it("no modifica nada si los datos son inválidos", async () => {
    const jugador = await insertarJugador({ nombre: "Pedri", dorsal: 8 });

    const resultado = await actualizarJugador(jugador.id, formulario({ ...VALIDO, dorsal: "0" }));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.campos?.dorsal).toBe("Ingresa un dorsal entre 1 y 99.");
    const sinCambios = await prisma.jugador.findUniqueOrThrow({ where: { id: jugador.id } });
    expect(sinCambios).toMatchObject({ nombre: "Pedri", dorsal: 8 });
  });

  it("informa si el jugador ya no existe", async () => {
    const resultado = await actualizarJugador(999_999, formulario(VALIDO));
    expect(resultado).toEqual({ ok: false, error: "Este jugador ya no existe. Recarga la lista." });
  });

  it.each([0, -1, 1.5, Number.NaN])("rechaza el id inválido %s", async (id) => {
    const resultado = await actualizarJugador(id, formulario(VALIDO));
    expect(resultado).toEqual({ ok: false, error: "El identificador del jugador no es válido." });
  });
});

describe("eliminarJugador", () => {
  it("elimina al jugador y su ficha en cascada", async () => {
    const jugador = await insertarJugador();
    await prisma.detalleJugador.create({ data: { jugadorId: jugador.id, nacionalidad: "España" } });

    const resultado = await eliminarJugador(jugador.id);

    expect(resultado).toEqual({ ok: true, datos: { id: jugador.id } });
    expect(await prisma.jugador.count()).toBe(0);
    expect(await prisma.detalleJugador.count()).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith(`/jugadores/${jugador.id}`);
  });

  it("no elimina a un jugador con goles registrados", async () => {
    const jugador = await insertarJugador();
    await registrarGol(jugador.id);

    const resultado = await eliminarJugador(jugador.id);

    expect(resultado).toEqual({
      ok: false,
      error: "No se puede eliminar: el jugador tiene goles registrados en partidos.",
    });
    expect(await prisma.jugador.count()).toBe(1);
  });

  it("informa si el jugador ya había sido eliminado", async () => {
    const jugador = await insertarJugador();
    await eliminarJugador(jugador.id);

    const resultado = await eliminarJugador(jugador.id);

    expect(resultado).toEqual({ ok: false, error: "Este jugador ya había sido eliminado." });
  });

  it.each([0, -3, 2.5])("rechaza el id inválido %s", async (id) => {
    const resultado = await eliminarJugador(id);
    expect(resultado).toEqual({ ok: false, error: "El identificador del jugador no es válido." });
  });
});
