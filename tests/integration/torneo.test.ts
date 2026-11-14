import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  obtenerEquipo,
  obtenerEquipos,
  obtenerEstadisticasJugador,
  obtenerGoleadores,
  obtenerOpcionesDeEquipo,
  obtenerPartidos,
  obtenerPosiciones,
} from "@/lib/torneo-consultas";
import { usarSesion } from "./sesion-pruebas";

function crearEquipo(nombre: string, grupo = "A") {
  return prisma.equipo.create({
    data: { nombre, confederacion: "UEFA", grupo, rankingFifa: 10 },
  });
}

function crearJugador(nombre: string, equipoId: number | null, dorsal = 10) {
  return prisma.jugador.create({ data: { nombre, posicion: "Delantero", dorsal, equipoId } });
}

function crearPartido(
  localId: number,
  visitanteId: number,
  datos: Partial<{ fase: string; fecha: Date; jugado: boolean }> = {},
) {
  return prisma.partido.create({
    data: {
      localId,
      visitanteId,
      fase: datos.fase ?? "Grupos",
      fecha: datos.fecha ?? null,
      jugado: datos.jugado ?? true,
    },
  });
}

/** Registra `cantidad` goles de un equipo en un partido, sin goleador. */
function marcar(partidoId: number, equipoId: number, cantidad: number) {
  return prisma.gol.createMany({
    data: Array.from({ length: cantidad }, () => ({ partidoId, equipoId })),
  });
}

/**
 * Grupo A con tres partidos jugados y uno pendiente:
 *   España 2-1 Perú · España 0-0 Japón · Perú 3-0 Japón · Japón vs. España (por jugar).
 */
async function torneoDeEjemplo() {
  const espana = await crearEquipo("España");
  const peru = await crearEquipo("Perú");
  const japon = await crearEquipo("Japón");
  const yamal = await crearJugador("Lamine Yamal", espana.id, 19);
  const pedri = await crearJugador("Pedri", espana.id, 8);

  const p1 = await crearPartido(espana.id, peru.id, { fecha: new Date("2026-06-11T18:00:00Z") });
  await prisma.gol.createMany({
    data: [
      { partidoId: p1.id, equipoId: espana.id, jugadorId: yamal.id, minuto: 12 },
      { partidoId: p1.id, equipoId: espana.id, jugadorId: yamal.id, minuto: 80, esPenal: true },
      { partidoId: p1.id, equipoId: peru.id },
    ],
  });
  const p2 = await crearPartido(espana.id, japon.id, { fecha: new Date("2026-06-15T18:00:00Z") });
  const p3 = await crearPartido(peru.id, japon.id, { fecha: new Date("2026-06-16T18:00:00Z") });
  await marcar(p3.id, peru.id, 3);
  const p4 = await crearPartido(japon.id, espana.id, { jugado: false });

  return { espana, peru, japon, yamal, pedri, p1, p2, p3, p4 };
}

describe("marcador calculado desde los goles (H-32)", () => {
  it("cuenta los goles de cada equipo y distingue un 0-0 de un partido por jugar", async () => {
    const { p1, p2, p4 } = await torneoDeEjemplo();

    const partidos = await obtenerPartidos();
    const porId = new Map(partidos.map((p) => [p.id, p]));

    expect(porId.get(p1.id)).toMatchObject({ jugado: true, golesLocal: 2, golesVisitante: 1 });
    expect(porId.get(p2.id)).toMatchObject({ jugado: true, golesLocal: 0, golesVisitante: 0 });
    expect(porId.get(p4.id)).toMatchObject({ jugado: false, golesLocal: 0, golesVisitante: 0 });
  });

  it("el marcador cambia en cuanto se registra o se borra un gol", async () => {
    const { p2, japon } = await torneoDeEjemplo();
    const marcador = async () => {
      const partido = (await obtenerPartidos()).find((p) => p.id === p2.id)!;
      return [partido.golesLocal, partido.golesVisitante];
    };

    const gol = await prisma.gol.create({ data: { partidoId: p2.id, equipoId: japon.id } });
    expect(await marcador()).toEqual([0, 1]);

    await prisma.gol.delete({ where: { id: gol.id } });
    expect(await marcador()).toEqual([0, 0]);
  });

  it("ordena por fecha, deja al final los partidos sin fecha e incluye a los goleadores", async () => {
    const { p1, p2, p3, p4, yamal } = await torneoDeEjemplo();

    const partidos = await obtenerPartidos();

    expect(partidos.map((p) => p.id)).toEqual([p1.id, p2.id, p3.id, p4.id]);
    expect(partidos[0].fecha).toBe("2026-06-11T18:00:00.000Z");
    expect(partidos[3].fecha).toBeNull();
    expect(partidos[0].goles).toContainEqual(
      expect.objectContaining({
        minuto: 80,
        esPenal: true,
        jugador: { id: yamal.id, nombre: "Lamine Yamal" },
      }),
    );
    expect(partidos[0].goles).toContainEqual(
      expect.objectContaining({ jugador: null, minuto: null, esPenal: false }),
    );
  });
});

describe("tabla de posiciones como vista SQL (H-33)", () => {
  it("calcula puntos, partidos y goles, y ordena por los criterios de desempate", async () => {
    await torneoDeEjemplo();

    const posiciones = await obtenerPosiciones();

    expect(posiciones.map((p) => p.equipo.nombre)).toEqual(["España", "Perú", "Japón"]);
    expect(posiciones[0]).toMatchObject({ pj: 2, pg: 1, pe: 1, pp: 0, gf: 2, gc: 1, dg: 1, puntos: 4 });
    expect(posiciones[1]).toMatchObject({ pj: 2, pg: 1, pe: 0, pp: 1, gf: 4, gc: 2, dg: 2, puntos: 3 });
    expect(posiciones[2]).toMatchObject({ pj: 2, pg: 0, pe: 1, pp: 1, gf: 0, gc: 3, dg: -3, puntos: 1 });
  });

  it("incluye con ceros a los equipos que no han jugado", async () => {
    const equipo = await crearEquipo("Francia", "B");

    expect(await obtenerPosiciones()).toEqual([
      {
        equipo: { id: equipo.id, nombre: "Francia" },
        grupo: "B",
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        puntos: 0,
      },
    ]);
  });

  it("no cuenta los partidos por jugar ni los de fases eliminatorias", async () => {
    const a = await crearEquipo("España");
    const b = await crearEquipo("Perú");
    const pendiente = await crearPartido(a.id, b.id, { jugado: false });
    await marcar(pendiente.id, a.id, 1);
    const final = await crearPartido(a.id, b.id, { fase: "Final" });
    await marcar(final.id, a.id, 2);

    const posiciones = await obtenerPosiciones();

    expect(posiciones.every((p) => p.pj === 0 && p.puntos === 0 && p.gf === 0)).toBe(true);
  });

  it("se actualiza sola al registrar un resultado nuevo", async () => {
    const { p4, japon } = await torneoDeEjemplo();

    await marcar(p4.id, japon.id, 5);
    await prisma.partido.update({ where: { id: p4.id }, data: { jugado: true } });

    const posiciones = await obtenerPosiciones();
    expect(posiciones.map((p) => [p.equipo.nombre, p.puntos])).toEqual([
      ["Japón", 4],
      ["España", 4],
      ["Perú", 3],
    ]);
  });
});

describe("equipos", () => {
  it("lista las selecciones por nombre con su número de jugadores", async () => {
    const { espana, japon, peru } = await torneoDeEjemplo();

    const equipos = await obtenerEquipos();

    expect(equipos.map((e) => [e.id, e.nombre, e.jugadores])).toEqual([
      [espana.id, "España", 2],
      [japon.id, "Japón", 0],
      [peru.id, "Perú", 0],
    ]);
    expect(equipos[0]).toMatchObject({ grupo: "A", confederacion: "UEFA", clasificado: true });
    expect(await obtenerOpcionesDeEquipo()).toEqual([
      { id: espana.id, nombre: "España" },
      { id: japon.id, nombre: "Japón" },
      { id: peru.id, nombre: "Perú" },
    ]);
  });

  it("devuelve la plantilla por dorsal, solo sus partidos y su posición", async () => {
    const { espana, p1, p2, p4 } = await torneoDeEjemplo();

    const datos = await obtenerEquipo(espana.id);

    expect(datos?.equipo).toMatchObject({ nombre: "España", jugadores: 2 });
    expect(datos?.plantilla.map((j) => [j.dorsal, j.nombre])).toEqual([
      [8, "Pedri"],
      [19, "Lamine Yamal"],
    ]);
    expect(datos?.partidos.map((p) => p.id)).toEqual([p1.id, p2.id, p4.id]);
    expect(datos?.posicion).toMatchObject({ pj: 2, puntos: 4, dg: 1 });
  });

  it("devuelve null si la selección no existe", async () => {
    expect(await obtenerEquipo(12345)).toBeNull();
  });

  it("al eliminar una selección, sus jugadores quedan sin selección", async () => {
    const equipo = await crearEquipo("Francia");
    const jugador = await crearJugador("Mbappé", equipo.id);

    await prisma.equipo.delete({ where: { id: equipo.id } });

    const guardado = await prisma.jugador.findUniqueOrThrow({ where: { id: jugador.id } });
    expect(guardado.equipoId).toBeNull();
  });
});

describe("goleadores y estadísticas del jugador", () => {
  it("ordena por goles y no cuenta los goles sin goleador", async () => {
    const { espana, yamal, pedri, p2 } = await torneoDeEjemplo();
    await prisma.gol.create({
      data: { partidoId: p2.id, equipoId: espana.id, jugadorId: pedri.id, minuto: 30 },
    });

    expect(await obtenerGoleadores()).toEqual([
      {
        jugador: { id: yamal.id, nombre: "Lamine Yamal" },
        equipo: { id: espana.id, nombre: "España" },
        goles: 2,
        penales: 1,
      },
      {
        jugador: { id: pedri.id, nombre: "Pedri" },
        equipo: { id: espana.id, nombre: "España" },
        goles: 1,
        penales: 0,
      },
    ]);
    expect(await obtenerGoleadores(1)).toHaveLength(1);
  });

  it("devuelve una lista vacía si no hay goles", async () => {
    expect(await obtenerGoleadores()).toEqual([]);
  });

  it("resume los goles del jugador con el rival de cada uno", async () => {
    const { yamal, peru, p1 } = await torneoDeEjemplo();

    const estadisticas = await obtenerEstadisticasJugador(yamal.id);

    expect(estadisticas).toMatchObject({ goles: 2, penales: 1, partidosConGol: 1 });
    expect(estadisticas.detalle.map((g) => [g.minuto, g.esPenal, g.rival, g.partido.id])).toEqual([
      [12, false, { id: peru.id, nombre: "Perú" }, p1.id],
      [80, true, { id: peru.id, nombre: "Perú" }, p1.id],
    ]);
  });

  it("un jugador sin goles tiene las estadísticas en cero", async () => {
    const { pedri } = await torneoDeEjemplo();

    expect(await obtenerEstadisticasJugador(pedri.id)).toEqual({
      goles: 0,
      penales: 0,
      partidosConGol: 0,
      detalle: [],
    });
  });
});

describe("restricciones de la base de datos (fase 6)", () => {
  it("UNIQUE(equipo_id, dorsal): el dorsal no se repite dentro de una selección (H-07)", async () => {
    const espana = await crearEquipo("España");
    const peru = await crearEquipo("Perú");
    await crearJugador("Pedri", espana.id, 10);

    await expect(crearJugador("Otro", espana.id, 10)).rejects.toMatchObject({ code: "P2002" });
    // En otra selección, o sin selección, el mismo dorsal es válido.
    await expect(crearJugador("Guerrero", peru.id, 10)).resolves.toBeDefined();
    await expect(crearJugador("Libre 1", null, 10)).resolves.toBeDefined();
    await expect(crearJugador("Libre 2", null, 10)).resolves.toBeDefined();
  });

  it("un gol solo puede subir a uno de los dos equipos del partido", async () => {
    const { p1, japon, espana } = await torneoDeEjemplo();

    await expect(
      prisma.gol.create({ data: { partidoId: p1.id, equipoId: japon.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.gol.create({ data: { partidoId: p1.id, equipoId: espana.id } }),
    ).resolves.toBeDefined();
  });

  it("el minuto del gol debe estar entre 1 y 130", async () => {
    const { p1, espana } = await torneoDeEjemplo();
    const gol = (minuto: number) =>
      prisma.gol.create({ data: { partidoId: p1.id, equipoId: espana.id, minuto } });

    await expect(gol(0)).rejects.toThrow();
    await expect(gol(131)).rejects.toThrow();
    await expect(gol(130)).resolves.toBeDefined();
  });

  it("un equipo no puede jugar contra sí mismo", async () => {
    const equipo = await crearEquipo("España");

    await expect(crearPartido(equipo.id, equipo.id)).rejects.toThrow();
  });

  it("las claves foráneas tienen índice (H-35)", async () => {
    const indices = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()`;

    expect(indices.map((i) => i.indexname)).toEqual(
      expect.arrayContaining([
        "jugadores_equipo_id_dorsal_key",
        "goles_partido_id_idx",
        "goles_equipo_id_idx",
        "goles_jugador_id_idx",
        "partidos_local_id_idx",
        "partidos_visitante_id_idx",
      ]),
    );
  });
});

describe("control de acceso", () => {
  it("sin sesión, las consultas del torneo redirigen al inicio de sesión", async () => {
    usarSesion(null);

    for (const consulta of [
      () => obtenerPartidos(),
      () => obtenerPosiciones(),
      () => obtenerEquipos(),
      () => obtenerOpcionesDeEquipo(),
      () => obtenerEquipo(1),
      () => obtenerGoleadores(),
      () => obtenerEstadisticasJugador(1),
    ]) {
      await expect(consulta()).rejects.toThrow("REDIRECT:/login");
    }
  });

  it("el rol demo puede leer el torneo", async () => {
    await torneoDeEjemplo();
    usarSesion("demo");

    expect(await obtenerPartidos()).toHaveLength(4);
    expect(await obtenerPosiciones()).toHaveLength(3);
    expect(await obtenerEquipos()).toHaveLength(3);
  });
});
