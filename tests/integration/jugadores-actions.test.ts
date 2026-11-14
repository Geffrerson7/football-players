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
  return prisma.gol.create({
    data: { partidoId: partido.id, equipoId: local.id, jugadorId, minuto: 15 },
  });
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
        equipo: null,
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
        equipo: null,
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

describe("selección y regla del dorsal (H-07, H-31)", () => {
  function crearEquipo(nombre: string) {
    return prisma.equipo.create({
      data: { nombre, confederacion: "UEFA", grupo: "A", rankingFifa: 1 },
    });
  }

  const MENSAJE_DORSAL = "El dorsal 19 ya lo lleva otro jugador de esa selección.";

  it("registra al jugador en la selección elegida y revalida equipos y partidos", async () => {
    const espana = await crearEquipo("España");

    const resultado = await crearJugador(formulario({ ...VALIDO, equipoId: String(espana.id) }));

    expect(resultado.ok && resultado.datos.equipo).toEqual({ id: espana.id, nombre: "España" });
    expect(revalidatePath).toHaveBeenCalledWith("/equipos", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/partidos");
  });

  it("sin selección («ninguna» o vacío), el jugador queda sin equipo", async () => {
    const a = await crearJugador(formulario({ ...VALIDO, equipoId: "ninguna" }));
    const b = await crearJugador(formulario({ ...VALIDO, equipoId: "" }));

    // Dos jugadores sin selección pueden compartir dorsal.
    expect(a.ok && a.datos.equipo).toBeNull();
    expect(b.ok && b.datos.equipo).toBeNull();
  });

  it("rechaza un dorsal repetido en la misma selección y no inserta nada", async () => {
    const espana = await crearEquipo("España");
    const campos = formulario({ ...VALIDO, equipoId: String(espana.id) });
    await crearJugador(campos);

    const resultado = await crearJugador(campos);

    expect(resultado).toEqual({
      ok: false,
      error: MENSAJE_DORSAL,
      campos: { dorsal: MENSAJE_DORSAL },
    });
    expect(await prisma.jugador.count()).toBe(1);
  });

  it("permite el mismo dorsal en selecciones distintas", async () => {
    const espana = await crearEquipo("España");
    const peru = await crearEquipo("Perú");

    await crearJugador(formulario({ ...VALIDO, equipoId: String(espana.id) }));
    const resultado = await crearJugador(formulario({ ...VALIDO, equipoId: String(peru.id) }));

    expect(resultado.ok).toBe(true);
  });

  it("al editar, rechaza cambiar a un dorsal ocupado o a una selección donde ya está ocupado", async () => {
    const espana = await crearEquipo("España");
    await crearJugador(formulario({ ...VALIDO, equipoId: String(espana.id) }));
    const companero = await prisma.jugador.create({
      data: { nombre: "Pedri", posicion: "Mediocampista", dorsal: 8, equipoId: espana.id },
    });
    const libre = await prisma.jugador.create({
      data: { nombre: "Sin equipo", posicion: "Defensa", dorsal: 19 },
    });

    const porDorsal = await actualizarJugador(
      companero.id,
      formulario({ ...VALIDO, nombre: "Pedri", equipoId: String(espana.id), activo: "on" }),
    );
    const porSeleccion = await actualizarJugador(
      libre.id,
      formulario({ ...VALIDO, nombre: "Sin equipo", equipoId: String(espana.id), activo: "on" }),
    );

    expect(!porDorsal.ok && porDorsal.campos?.dorsal).toBe(MENSAJE_DORSAL);
    expect(!porSeleccion.ok && porSeleccion.campos?.dorsal).toBe(MENSAJE_DORSAL);
    expect(await prisma.jugador.findUniqueOrThrow({ where: { id: companero.id } })).toMatchObject({
      dorsal: 8,
    });
    expect(await prisma.jugador.findUniqueOrThrow({ where: { id: libre.id } })).toMatchObject({
      equipoId: null,
    });
  });

  it("al editar, puede conservar su propio dorsal y quitarse la selección", async () => {
    const espana = await crearEquipo("España");
    const creado = await crearJugador(formulario({ ...VALIDO, equipoId: String(espana.id) }));
    const id = creado.ok ? creado.datos.id : -1;

    const mismo = await actualizarJugador(
      id,
      formulario({ ...VALIDO, equipoId: String(espana.id), activo: "on" }),
    );
    const sinEquipo = await actualizarJugador(
      id,
      formulario({ ...VALIDO, equipoId: "ninguna", activo: "on" }),
    );

    expect(mismo.ok).toBe(true);
    expect(sinEquipo.ok && sinEquipo.datos.equipo).toBeNull();
  });

  it("informa si la selección elegida ya no existe", async () => {
    const mensaje = "La selección elegida ya no existe. Recarga la página y elige otra.";

    const resultado = await crearJugador(formulario({ ...VALIDO, equipoId: "999999" }));

    expect(resultado).toEqual({ ok: false, error: mensaje, campos: { equipoId: mensaje } });
    expect(await prisma.jugador.count()).toBe(0);
  });

  it.each(["abc", "0", "-3", "1.5"])("rechaza la selección inválida «%s»", async (equipoId) => {
    const resultado = await crearJugador(formulario({ ...VALIDO, equipoId }));

    expect(!resultado.ok && resultado.campos?.equipoId).toBe("Elige una selección válida.");
    expect(await prisma.jugador.count()).toBe(0);
  });
});
