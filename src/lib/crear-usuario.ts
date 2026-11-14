// Alta de usuarios para Better Auth. Lo usan `prisma/usuarios.ts` (pnpm db:usuarios) y
// las pruebas de integración. Solo usa rutas relativas para poder ejecutarse con tsx.
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../generated/prisma/client";
import type { Rol } from "./roles";

export type DatosUsuario = {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
};

/**
 * Crea el usuario o, si el correo ya existe, actualiza su nombre, rol y contraseña.
 * Es idempotente. La contraseña se guarda con el mismo hash (scrypt) que usa Better Auth.
 */
export async function guardarUsuario(prisma: PrismaClient, datos: DatosUsuario) {
  // Better Auth compara los correos en minúsculas.
  const email = datos.email.trim().toLowerCase();
  const password = await hashPassword(datos.password);

  return prisma.$transaction(async (tx) => {
    const usuario = await tx.user.upsert({
      where: { email },
      create: {
        id: randomUUID(),
        name: datos.nombre,
        email,
        emailVerified: true,
        role: datos.rol,
      },
      update: { name: datos.nombre, role: datos.rol },
    });

    // En Better Auth, la contraseña vive en la cuenta del proveedor "credential".
    await tx.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: usuario.id } },
      create: {
        id: randomUUID(),
        providerId: "credential",
        accountId: usuario.id,
        userId: usuario.id,
        password,
      },
      update: { password },
    });

    return usuario;
  });
}
