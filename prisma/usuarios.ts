/**
 * Crea o actualiza los usuarios de la aplicación (pnpm db:usuarios):
 *
 *   - Administrador: ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres).
 *   - Demo (solo lectura): DEMO_EMAIL y DEMO_PASSWORD (mínimo 8 caracteres).
 *
 * Las credenciales solo se leen del entorno (.env); nunca se guardan en el repositorio
 * ni se imprimen. Es idempotente: si el usuario ya existe, actualiza su contraseña y
 * su rol. Se procesa cada usuario cuyas dos variables estén definidas.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { guardarUsuario, type DatosUsuario } from "../src/lib/crear-usuario";

function leerUsuario(
  prefijo: "ADMIN" | "DEMO",
  base: Pick<DatosUsuario, "nombre" | "rol">,
  longitudMinima: number,
): DatosUsuario | null {
  const email = process.env[`${prefijo}_EMAIL`]?.trim();
  const password = process.env[`${prefijo}_PASSWORD`];
  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error(`Define ${prefijo}_EMAIL y ${prefijo}_PASSWORD a la vez.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${prefijo}_EMAIL no es un correo válido.`);
  }
  if (password.length < longitudMinima) {
    throw new Error(`${prefijo}_PASSWORD debe tener al menos ${longitudMinima} caracteres.`);
  }
  return { ...base, email, password };
}

async function main() {
  const usuarios = [
    leerUsuario("ADMIN", { nombre: "Administrador", rol: "admin" }, 12),
    leerUsuario("DEMO", { nombre: "Demo", rol: "demo" }, 8),
  ].filter((u): u is DatosUsuario => u !== null);

  if (usuarios.length === 0) {
    throw new Error(
      "No hay usuarios que crear: define ADMIN_EMAIL y ADMIN_PASSWORD, o DEMO_EMAIL y DEMO_PASSWORD (ver .env.example).",
    );
  }
  if (new Set(usuarios.map((u) => u.email.toLowerCase())).size !== usuarios.length) {
    throw new Error("ADMIN_EMAIL y DEMO_EMAIL deben ser correos distintos.");
  }

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta DATABASE_URL en el entorno.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    for (const datos of usuarios) {
      const usuario = await guardarUsuario(prisma, datos);
      console.log(`Usuario ${usuario.role} listo: ${usuario.email}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // Solo el mensaje: el objeto de error podría incluir datos de la consulta.
  console.error(error instanceof Error ? error.message : "Error desconocido al crear usuarios.");
  process.exitCode = 1;
});
