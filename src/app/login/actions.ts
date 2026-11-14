"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerAuth } from "@/lib/auth";
import { registrarIntento } from "@/lib/limite-intentos";

export type EstadoLogin = { error: string } | null;

const ERROR_CREDENCIALES = "Correo o contraseña incorrectos.";
const ERROR_GENERICO = "No se pudo iniciar sesión. Inténtalo nuevamente.";

/**
 * ¿Es el error de «credenciales incorrectas» de Better Auth (HTTP 401)?
 * Se comprueba por sus propiedades y no con `instanceof APIError`: en el build de
 * producción la clase puede estar duplicada entre módulos y `instanceof` falla.
 */
function esErrorDeCredenciales(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  return status === "UNAUTHORIZED" || statusCode === 401;
}

/**
 * Inicia la sesión en el servidor; el plugin `nextCookies` escribe la cookie.
 * Devuelve un mensaje de error o null. Nunca registra las credenciales en los logs.
 */
async function abrirSesion(email: string, password: string): Promise<string | null> {
  try {
    await obtenerAuth().api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    return null;
  } catch (error) {
    if (esErrorDeCredenciales(error)) return ERROR_CREDENCIALES;
    console.error(
      "Error al iniciar sesión:",
      error instanceof Error ? error.message : "error desconocido",
    );
    return ERROR_GENERICO;
  }
}

export async function iniciarSesion(
  _previo: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Ingresa tu correo y tu contraseña." };
  // Better Auth rechaza entradas más largas; evita además calcular hashes de textos enormes.
  if (email.length > 254 || password.length > 128) return { error: ERROR_CREDENCIALES };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
  if (!registrarIntento(`${ip}|${email}`)) {
    return { error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." };
  }

  const error = await abrirSesion(email, password);
  if (error) return { error };
  redirect("/");
}

/**
 * «Entrar como demo»: las credenciales se leen de variables de entorno en el
 * servidor y nunca llegan al navegador.
 */
export async function entrarComoDemo(): Promise<EstadoLogin> {
  const email = process.env.DEMO_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    return { error: "El acceso demo no está configurado en este entorno." };
  }

  const error = await abrirSesion(email, password);
  if (error) {
    // No se distingue el motivo para no dar pistas sobre las credenciales demo.
    return { error: "No se pudo iniciar la sesión demo. Inténtalo más tarde." };
  }
  redirect("/");
}

export async function cerrarSesion(): Promise<void> {
  try {
    await obtenerAuth().api.signOut({ headers: await headers() });
  } catch {
    // Sin sesión válida no hay nada que cerrar.
  }
  redirect("/login");
}
