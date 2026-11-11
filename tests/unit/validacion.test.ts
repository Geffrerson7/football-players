import { afterEach, describe, expect, it, vi } from "vitest";
import { POSICIONES } from "@/lib/jugadores";
import { jugadorSchema } from "@/lib/validacion";

const valido = {
  nombre: "Lamine Yamal",
  posicion: "Delantero",
  dorsal: "19",
  fechaNacimiento: "2007-07-13",
  activo: true,
};

function errores(datos: Record<string, unknown>) {
  const resultado = jugadorSchema.safeParse(datos);
  if (resultado.success) return {};
  return Object.fromEntries(resultado.error.issues.map((i) => [String(i.path[0]), i.message]));
}

afterEach(() => vi.useRealTimers());

describe("jugadorSchema", () => {
  it("acepta un jugador válido y convierte el dorsal a número", () => {
    expect(jugadorSchema.parse(valido)).toEqual({ ...valido, dorsal: 19 });
  });

  it("recorta los espacios del nombre", () => {
    expect(jugadorSchema.parse({ ...valido, nombre: "  Pedri  " }).nombre).toBe("Pedri");
  });

  describe("nombre", () => {
    it.each(["", "   "])("rechaza %j", (nombre) => {
      expect(errores({ ...valido, nombre }).nombre).toBe("Ingresa el nombre.");
    });

    it("rechaza más de 255 caracteres", () => {
      expect(errores({ ...valido, nombre: "a".repeat(256) }).nombre).toMatch(/255/);
      expect(errores({ ...valido, nombre: "a".repeat(255) }).nombre).toBeUndefined();
    });
  });

  describe("posición", () => {
    it.each(POSICIONES)("acepta %s", (posicion) => {
      expect(errores({ ...valido, posicion }).posicion).toBeUndefined();
    });

    it.each(["Utilero", "", "delantero"])("rechaza %j", (posicion) => {
      expect(errores({ ...valido, posicion }).posicion).toBe("Selecciona una posición válida.");
    });
  });

  describe("dorsal", () => {
    it.each(["1", "99", 1, 99])("acepta el límite %j", (dorsal) => {
      expect(errores({ ...valido, dorsal }).dorsal).toBeUndefined();
    });

    it.each(["0", "100", "-5", "1.5", "abc", ""])("rechaza %j", (dorsal) => {
      expect(errores({ ...valido, dorsal }).dorsal).toBe("Ingresa un dorsal entre 1 y 99.");
    });
  });

  describe("fecha de nacimiento", () => {
    it("acepta el límite inferior y el día de hoy", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 10, 11, 10, 0));
      expect(errores({ ...valido, fechaNacimiento: "1900-01-01" }).fechaNacimiento).toBeUndefined();
      expect(errores({ ...valido, fechaNacimiento: "2026-11-11" }).fechaNacimiento).toBeUndefined();
    });

    it("rechaza fechas futuras", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 10, 11, 10, 0));
      expect(errores({ ...valido, fechaNacimiento: "2026-11-12" }).fechaNacimiento).toMatch(
        /futura/,
      );
    });

    it("rechaza fechas anteriores a 1900", () => {
      expect(errores({ ...valido, fechaNacimiento: "1899-12-31" }).fechaNacimiento).toMatch(/1900/);
    });

    it.each(["", "13/07/2007", "2007-02-30", "2007-7-13"])(
      "rechaza el formato %j con un único error",
      (fecha) => {
        const resultado = jugadorSchema.safeParse({ ...valido, fechaNacimiento: fecha });
        const mensajes = resultado.success
          ? []
          : resultado.error.issues
              .filter((i) => i.path[0] === "fechaNacimiento")
              .map((i) => i.message);
        expect(mensajes).toEqual(["Ingresa una fecha de nacimiento válida."]);
      },
    );
  });

  it("exige que activo sea booleano", () => {
    expect(errores({ ...valido, activo: "on" }).activo).toBeDefined();
  });
});
