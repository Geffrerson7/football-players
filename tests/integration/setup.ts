import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import { urlDePrueba } from "./url-pruebas";

// Debe ocurrir antes de la primera consulta: el cliente de Prisma es perezoso
// y lee DATABASE_URL al crearse.
process.env.DATABASE_URL = urlDePrueba();
delete process.env.DIRECT_URL;

// Better Auth: secreto solo para pruebas; nunca se usa el del .env.
process.env.BETTER_AUTH_SECRET = "secreto-solo-para-las-pruebas-de-integracion";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
delete process.env.VERCEL_URL;
delete process.env.DEMO_EMAIL;
delete process.env.DEMO_PASSWORD;

// revalidatePath solo funciona dentro de una petición de Next.js.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Fuera de una petición no existen cabeceras ni cookies: las cabeceras salen de la
// sesión elegida con `usarSesion` y las cookies que escribe Better Auth se descartan.
vi.mock("next/headers", async () => {
  const { cabecerasActuales } = await import("./sesion-pruebas");
  return {
    headers: async () => cabecerasActuales(),
    cookies: async () => ({ set: () => {}, get: () => undefined, delete: () => {} }),
  };
});

// Como en Next.js, `redirect` interrumpe la ejecución lanzando un error.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((ruta: string) => {
    throw new Error(`REDIRECT:${ruta}`);
  }),
}));

const { prisma } = await import("@/lib/prisma");
const { prepararUsuarios, usarSesion } = await import("./sesion-pruebas");

const TABLAS = [
  "goles",
  "posiciones_por_grupo",
  "partidos",
  "detalle_jugadores",
  "jugadores",
  "equipos",
];

// Los usuarios y sus sesiones se crean una vez por archivo (el hash de la contraseña es
// lento a propósito); las tablas de datos se vacían antes de cada prueba.
beforeAll(async () => {
  await prepararUsuarios();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLAS.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  // Por defecto, las pruebas se ejecutan como administrador.
  usarSesion("admin");
});

afterAll(async () => {
  await prisma.$disconnect();
});
