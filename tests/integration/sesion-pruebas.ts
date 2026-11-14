import { obtenerAuth } from "@/lib/auth";
import { guardarUsuario } from "@/lib/crear-usuario";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@/lib/roles";

/**
 * Sesiones reales de Better Auth para las pruebas de integración: los usuarios se
 * crean en la base de pruebas y se inicia sesión de verdad, de modo que las Server
 * Actions validan una cookie auténtica (firma, sesión en la base y rol).
 */
export const USUARIOS: Record<Rol, { nombre: string; email: string; password: string }> = {
  admin: { nombre: "Admin de pruebas", email: "admin@pruebas.test", password: "clave-admin-de-pruebas" },
  demo: { nombre: "Demo de pruebas", email: "demo@pruebas.test", password: "clave-demo-de-pruebas" },
};

const cookies: Partial<Record<Rol, string>> = {};
let cookieActual = "";

/** Cabeceras de la «petición» en curso; las devuelve el mock de `next/headers`. */
export function cabecerasActuales(): Headers {
  return new Headers(cookieActual ? { cookie: cookieActual } : {});
}

/** Convierte las cabeceras Set-Cookie de una respuesta en el valor de una cabecera Cookie. */
export function cookieDesde(respuesta: Headers): string {
  return respuesta
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

/** Crea los usuarios admin y demo e inicia una sesión para cada uno. */
export async function prepararUsuarios() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "usuarios", "verificaciones" CASCADE`);
  for (const rol of ["admin", "demo"] as const) {
    await guardarUsuario(prisma, { ...USUARIOS[rol], rol });
    const { headers } = await obtenerAuth().api.signInEmail({
      body: { email: USUARIOS[rol].email, password: USUARIOS[rol].password },
      returnHeaders: true,
    });
    cookies[rol] = cookieDesde(headers);
  }
}

/** Elige con qué sesión se ejecuta lo siguiente: un rol, una cookie concreta o ninguna (null). */
export function usarSesion(sesion: Rol | { cookie: string } | null) {
  if (sesion === null) cookieActual = "";
  else if (typeof sesion === "string") cookieActual = cookies[sesion] ?? "";
  else cookieActual = sesion.cookie;
}

export function cookieDe(rol: Rol): string {
  return cookies[rol] ?? "";
}
