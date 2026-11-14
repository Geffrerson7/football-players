import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { obtenerAuth } from "./auth";
import { MENSAJE_SIN_PERMISOS, MENSAJE_SIN_SESION, esRol, type Rol } from "./roles";

export type UsuarioSesion = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
};

/**
 * Usuario de la sesión actual, o null si no hay sesión válida.
 * Siempre se valida contra la base de datos (sin caché en cookies), así que una
 * sesión cerrada o un cambio de rol tienen efecto inmediato.
 * `cache` evita repetir la consulta dentro de un mismo render (layout y página).
 */
export const obtenerSesion = cache(async (): Promise<UsuarioSesion | null> => {
  // `headers()` va primero: marca la ruta como dinámica, de modo que `next build` no
  // intenta prerenderizarla (ni necesita BETTER_AUTH_SECRET o la base de datos).
  const cabeceras = await headers();
  const sesion = await obtenerAuth().api.getSession({ headers: cabeceras });
  if (!sesion) return null;

  const { id, name, email, role } = sesion.user;
  // Un rol desconocido se trata con el mínimo privilegio.
  return { id, nombre: name, email, rol: esRol(role) ? role : "demo" };
});

/** Para páginas y consultas: devuelve el usuario o redirige al inicio de sesión. */
export async function exigirSesion(): Promise<UsuarioSesion> {
  const usuario = await obtenerSesion();
  if (!usuario) redirect("/login");
  return usuario;
}

/**
 * Comprobación de permisos para las Server Actions que modifican datos.
 * Devuelve null si el usuario puede escribir (rol `admin`) o el mensaje de rechazo.
 *
 * Debe llamarse al inicio de cada Server Action: son endpoints HTTP que se pueden
 * invocar directamente, así que ocultar botones en la interfaz no protege nada.
 */
export async function errorDePermisoDeEscritura(): Promise<string | null> {
  const usuario = await obtenerSesion();
  if (!usuario) return MENSAJE_SIN_SESION;
  if (usuario.rol !== "admin") return MENSAJE_SIN_PERMISOS;
  return null;
}
