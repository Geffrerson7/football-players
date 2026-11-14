// Roles y mensajes de permisos: se usan tanto en el servidor como en el cliente.

export const ROLES = ["admin", "demo"] as const;
export type Rol = (typeof ROLES)[number];

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor);
}

export function etiquetaRol(rol: Rol): string {
  return rol === "admin" ? "Administrador" : "Demo";
}

export const MENSAJE_SIN_SESION = "Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.";
export const MENSAJE_SIN_PERMISOS = "El usuario demo no tiene permisos para modificar datos.";
