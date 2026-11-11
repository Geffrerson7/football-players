import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calcularEdad,
  etiquetaEstado,
  fechaAISO,
  formatearFecha,
  hoyISO,
  iniciales,
} from "@/lib/jugadores";

const TZ_ORIGINAL = process.env.TZ;

afterEach(() => {
  process.env.TZ = TZ_ORIGINAL;
  vi.useRealTimers();
});

describe("formatearFecha", () => {
  it("formatea en formato corto por defecto", () => {
    expect(formatearFecha("2000-05-14")).toMatch(/^14 may\.? 2000$/);
  });

  it("formatea en formato largo", () => {
    expect(formatearFecha("2000-05-14", "largo")).toBe("14 de mayo de 2000");
  });

  it("acepta un timestamp ISO completo y usa solo la fecha", () => {
    expect(formatearFecha("2007-07-13T00:00:00.000Z", "largo")).toBe("13 de julio de 2007");
  });

  it.each(["Pacific/Kiritimati", "Pacific/Pago_Pago", "America/Lima"])(
    "no desplaza el día en la zona horaria %s",
    (zona) => {
      process.env.TZ = zona;
      expect(formatearFecha("2000-01-01", "largo")).toBe("01 de enero de 2000");
      expect(formatearFecha("1999-12-31", "largo")).toBe("31 de diciembre de 1999");
    },
  );

  it.each([null, "", "no-es-fecha", "2000-13"])("devuelve el valor vacío para %j", (valor) => {
    expect(formatearFecha(valor)).toBe("—");
    expect(formatearFecha(valor, "largo", "No disponible")).toBe("No disponible");
  });
});

describe("calcularEdad", () => {
  const hoy = (iso: string) => new Date(`${iso}T12:00:00`);

  it("no suma el año antes del cumpleaños", () => {
    expect(calcularEdad("2000-05-14", hoy("2026-05-13"))).toBe(25);
  });

  it("suma el año el mismo día del cumpleaños", () => {
    expect(calcularEdad("2000-05-14", hoy("2026-05-14"))).toBe(26);
  });

  it("trata el 29 de febrero en años no bisiestos", () => {
    expect(calcularEdad("2000-02-29", hoy("2023-02-28"))).toBe(22);
    expect(calcularEdad("2000-02-29", hoy("2023-03-01"))).toBe(23);
  });

  it("devuelve null para fechas futuras", () => {
    expect(calcularEdad("2030-01-01", hoy("2026-11-11"))).toBeNull();
  });

  it.each([null, "", "basura"])("devuelve null para %j", (valor) => {
    expect(calcularEdad(valor, hoy("2026-11-11"))).toBeNull();
  });
});

describe("fechaAISO", () => {
  it("convierte un DATE de Prisma (medianoche UTC) sin desfase", () => {
    process.env.TZ = "Pacific/Pago_Pago"; // UTC-11
    expect(fechaAISO(new Date(Date.UTC(2007, 6, 13)))).toBe("2007-07-13");
  });

  it("devuelve null si no hay fecha", () => {
    expect(fechaAISO(null)).toBeNull();
  });
});

describe("hoyISO", () => {
  it("usa la fecha local, con ceros a la izquierda", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 0, 5, 23, 59));
    expect(hoyISO()).toBe("2026-01-05");
  });
});

describe("iniciales", () => {
  it.each([
    ["Lionel Messi", "LM"],
    ["  lionel   andrés  messi ", "LA"],
    ["Kylian", "K"],
    ["", ""],
  ])("%j → %j", (nombre, esperado) => {
    expect(iniciales(nombre)).toBe(esperado);
  });
});

describe("etiquetaEstado", () => {
  it("usa un único par de términos", () => {
    expect(etiquetaEstado(true)).toBe("Activo");
    expect(etiquetaEstado(false)).toBe("Inactivo");
  });
});
