import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta la variable de entorno DATABASE_URL. Copia .env.example a .env y configúrala.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// En desarrollo, el hot reload de Next.js re-evalúa los módulos; reutilizamos
// una única instancia para no abrir conexiones nuevas en cada recarga.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function obtenerCliente(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

/**
 * Cliente de Prisma perezoso: se crea en la primera consulta, no al importar el
 * módulo. Así `next build` no necesita DATABASE_URL ni acceso a la base de datos.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_destino, propiedad) {
    const cliente = obtenerCliente();
    const valor = Reflect.get(cliente, propiedad, cliente);
    return typeof valor === "function" ? valor.bind(cliente) : valor;
  },
});
