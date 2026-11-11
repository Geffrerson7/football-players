import { describe, expect, it } from "vitest";
import { obtenerJugadorConDetalle, obtenerJugadores } from "@/app/jugadores/data";
import { prisma } from "@/lib/prisma";

describe("obtenerJugadores", () => {
  it("devuelve una lista vacía si no hay jugadores", async () => {
    expect(await obtenerJugadores()).toEqual([]);
  });

  it("ordena por dorsal y, a igual dorsal, por id", async () => {
    await prisma.jugador.createMany({
      data: [
        { nombre: "Messi", posicion: "Delantero", dorsal: 10 },
        { nombre: "Vinicius", posicion: "Delantero", dorsal: 7 },
        { nombre: "Mbappé", posicion: "Delantero", dorsal: 10 },
        { nombre: "Militão", posicion: "Defensa", dorsal: 3 },
      ],
    });

    const nombres = (await obtenerJugadores()).map((j) => j.nombre);

    expect(nombres).toEqual(["Militão", "Vinicius", "Messi", "Mbappé"]);
  });

  it("serializa la fecha como YYYY-MM-DD y trata activo nulo como activo", async () => {
    await prisma.jugador.create({
      data: {
        nombre: "Musiala",
        posicion: "Mediocampista",
        dorsal: 10,
        activo: null,
        fechaNacimiento: new Date("2003-02-26T00:00:00Z"),
      },
    });

    const [jugador] = await obtenerJugadores();

    expect(jugador).toMatchObject({ activo: true, fechaNacimiento: "2003-02-26" });
  });
});

describe("obtenerJugadorConDetalle", () => {
  it("devuelve null si el jugador no existe", async () => {
    expect(await obtenerJugadorConDetalle(12345)).toBeNull();
  });

  it("devuelve detalle null si el jugador no tiene ficha", async () => {
    const jugador = await prisma.jugador.create({ data: { nombre: "Kubo", dorsal: 20 } });
    const perfil = await obtenerJugadorConDetalle(jugador.id);
    expect(perfil?.detalle).toBeNull();
  });

  it("incluye la ficha y convierte el peso decimal a texto", async () => {
    const jugador = await prisma.jugador.create({
      data: {
        nombre: "Lamine Yamal",
        dorsal: 19,
        detalle: {
          create: { nacionalidad: "España", alturaCm: 180, pesoKg: "72.50", pieHabil: "Izquierdo" },
        },
      },
    });

    const perfil = await obtenerJugadorConDetalle(jugador.id);

    expect(perfil?.detalle).toEqual({
      nacionalidad: "España",
      alturaCm: 180,
      pesoKg: "72.5",
      pieHabil: "Izquierdo",
      clubActual: null,
      fotoUrl: null,
      biografia: null,
    });
  });
});

describe("restricciones de la base de datos", () => {
  it("aplica los CHECK originales de detalle_jugadores", async () => {
    const jugador = await prisma.jugador.create({ data: { nombre: "Gavi", dorsal: 6 } });
    await expect(
      prisma.detalleJugador.create({ data: { jugadorId: jugador.id, pieHabil: "Zurdo" } }),
    ).rejects.toThrow();
    await expect(
      prisma.detalleJugador.create({ data: { jugadorId: jugador.id, alturaCm: 0 } }),
    ).rejects.toThrow();
  });
});
