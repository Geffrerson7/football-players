import { describe, expect, it } from "vitest";
import { idDeRuta } from "@/lib/rutas";
import {
  agruparPor,
  formatearFechaPartido,
  golesDe,
  ordenarPosiciones,
  resultadoPara,
  textoGol,
  textoMarcador,
  type PartidoDTO,
  type PosicionDTO,
} from "@/lib/torneo";

const ARGENTINA = { id: 1, nombre: "Argentina" };
const BRASIL = { id: 2, nombre: "Brasil" };

function partido(datos: Partial<PartidoDTO> = {}): PartidoDTO {
  return {
    id: 1,
    fase: "Grupos",
    fecha: "2026-06-11T18:00:00.000Z",
    jugado: true,
    local: ARGENTINA,
    visitante: BRASIL,
    golesLocal: 2,
    golesVisitante: 1,
    goles: [],
    ...datos,
  };
}

function posicion(nombre: string, datos: Partial<PosicionDTO> = {}): PosicionDTO {
  return {
    equipo: { id: nombre.length, nombre },
    grupo: "A",
    pj: 0,
    pg: 0,
    pe: 0,
    pp: 0,
    gf: 0,
    gc: 0,
    dg: 0,
    puntos: 0,
    ...datos,
  };
}

describe("formatearFechaPartido", () => {
  it("muestra el día y la hora en UTC, sin depender de la zona horaria local", () => {
    expect(formatearFechaPartido("2026-06-11T18:00:00.000Z")).toMatch(
      /^11 jun\.? 2026 · 18:00 UTC$/,
    );
  });

  it("no desplaza el día cerca de la medianoche", () => {
    expect(formatearFechaPartido("2026-06-11T23:30:00.000Z")).toMatch(/^11 jun\.? 2026 · 23:30 UTC$/);
    expect(formatearFechaPartido("2026-06-12T00:15:00.000Z")).toMatch(/^12 jun\.? 2026 · 00:15 UTC$/);
  });

  it.each([null, "", "no es una fecha"])("usa el texto alternativo con %j", (valor) => {
    expect(formatearFechaPartido(valor)).toBe("Fecha por definir");
    expect(formatearFechaPartido(valor, "—")).toBe("—");
  });
});

describe("ordenarPosiciones", () => {
  it("ordena por puntos, diferencia de goles, goles a favor y nombre", () => {
    const filas = [
      posicion("Brasil", { puntos: 3, dg: 0, gf: 4 }),
      posicion("Francia", { puntos: 4, dg: 2, gf: 3 }),
      posicion("Alemania", { puntos: 3, dg: 1, gf: 4 }),
      posicion("España", { puntos: 4, dg: 1, gf: 3 }),
      posicion("Argentina", { puntos: 3, dg: 0, gf: 4 }),
      posicion("Chile", { puntos: 3, dg: 0, gf: 5 }),
    ];

    expect(ordenarPosiciones(filas).map((f) => f.equipo.nombre)).toEqual([
      "Francia", // más puntos y mejor diferencia
      "España",
      "Alemania", // 3 puntos, +1
      "Chile", // 3 puntos, 0, más goles a favor
      "Argentina", // empate total: orden alfabético
      "Brasil",
    ]);
  });

  it("no modifica la lista original", () => {
    const filas = [posicion("B", { puntos: 0 }), posicion("A", { puntos: 3 })];
    ordenarPosiciones(filas);
    expect(filas.map((f) => f.equipo.nombre)).toEqual(["B", "A"]);
  });
});

describe("agruparPor", () => {
  it("agrupa conservando el orden interno y ordena las claves", () => {
    const grupos = agruparPor(
      [
        { grupo: "B", n: 1 },
        { grupo: "A", n: 2 },
        { grupo: "B", n: 3 },
      ],
      (e) => e.grupo,
    );

    expect(grupos).toEqual([
      ["A", [{ grupo: "A", n: 2 }]],
      ["B", [{ grupo: "B", n: 1 }, { grupo: "B", n: 3 }]],
    ]);
  });

  it("devuelve una lista vacía si no hay elementos", () => {
    expect(agruparPor([], () => "x")).toEqual([]);
  });
});

describe("resultadoPara", () => {
  it("distingue victoria, derrota y empate según el lado del equipo", () => {
    expect(resultadoPara(partido(), ARGENTINA.id)).toBe("victoria");
    expect(resultadoPara(partido(), BRASIL.id)).toBe("derrota");
    expect(resultadoPara(partido({ golesLocal: 1, golesVisitante: 1 }), BRASIL.id)).toBe("empate");
    expect(resultadoPara(partido({ golesLocal: 0, golesVisitante: 0 }), ARGENTINA.id)).toBe("empate");
  });

  it("devuelve null si el partido no se ha jugado o el equipo no participa", () => {
    expect(resultadoPara(partido({ jugado: false, golesLocal: 0, golesVisitante: 0 }), 1)).toBeNull();
    expect(resultadoPara(partido(), 99)).toBeNull();
  });
});

describe("textoMarcador", () => {
  it("muestra el marcador de un partido jugado, también el 0-0", () => {
    expect(textoMarcador(partido())).toBe("2 - 1");
    expect(textoMarcador(partido({ golesLocal: 0, golesVisitante: 0 }))).toBe("0 - 0");
  });

  it("no confunde un partido por jugar con un 0-0", () => {
    expect(textoMarcador(partido({ jugado: false, golesLocal: 0, golesVisitante: 0 }))).toBe(
      "Por jugar",
    );
  });
});

describe("goles", () => {
  const messi = { id: 1, nombre: "Lionel Messi" };

  it("textoGol combina goleador, minuto y penal", () => {
    expect(textoGol({ jugador: messi, minuto: 78, esPenal: true })).toBe("Lionel Messi 78′ (penal)");
    expect(textoGol({ jugador: messi, minuto: 15, esPenal: false })).toBe("Lionel Messi 15′");
    expect(textoGol({ jugador: null, minuto: null, esPenal: false })).toBe(
      "Goleador no registrado",
    );
  });

  it("golesDe filtra por equipo y ordena por minuto, con los goles sin minuto al final", () => {
    const p = partido({
      goles: [
        { id: 1, equipoId: 1, minuto: 78, esPenal: true, jugador: messi },
        { id: 2, equipoId: 2, minuto: 35, esPenal: false, jugador: null },
        { id: 3, equipoId: 1, minuto: null, esPenal: false, jugador: null },
        { id: 4, equipoId: 1, minuto: 15, esPenal: false, jugador: messi },
      ],
    });

    expect(golesDe(p, 1).map((g) => g.id)).toEqual([4, 1, 3]);
    expect(golesDe(p, 2).map((g) => g.id)).toEqual([2]);
    expect(golesDe(p, 99)).toEqual([]);
  });
});

describe("idDeRuta", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    ["2147483647", 2_147_483_647],
  ])("acepta %j", (texto, esperado) => {
    expect(idDeRuta(texto)).toBe(esperado);
  });

  it.each(["0", "-1", "1.5", "abc", "1e3", "", " 1", "2147483648", "99999999999999999999"])(
    "rechaza %j",
    (texto) => {
      expect(idDeRuta(texto)).toBeNull();
    },
  );
});
