import { afterAll, beforeEach, vi } from "vitest";
import { urlDePrueba } from "./url-pruebas";

// Debe ocurrir antes de la primera consulta: el cliente de Prisma es perezoso
// y lee DATABASE_URL al crearse.
process.env.DATABASE_URL = urlDePrueba();
delete process.env.DIRECT_URL;

// revalidatePath solo funciona dentro de una petición de Next.js.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { prisma } = await import("@/lib/prisma");

const TABLAS = [
  "goles",
  "posiciones_por_grupo",
  "partidos",
  "detalle_jugadores",
  "jugadores",
  "equipos",
];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLAS.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
