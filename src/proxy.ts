import { NextResponse, type NextRequest } from "next/server";
import { obtenerAuth } from "@/lib/auth";

const RUTA_LOGIN = "/login";

/**
 * Inicio de sesión obligatorio: sin una sesión válida, cualquier ruta redirige a /login.
 * (En Next.js 16, `proxy` sustituye a `middleware` y se ejecuta en Node.js, así que
 * la sesión se valida contra la base de datos y no solo por la presencia de la cookie.)
 *
 * Esto protege las páginas. Las Server Actions comprueban además la sesión y el rol
 * por su cuenta (src/lib/sesion.ts): no dependen de este archivo.
 */
export async function proxy(request: NextRequest) {
  const sesion = await obtenerAuth().api.getSession({ headers: request.headers });
  const enLogin = request.nextUrl.pathname === RUTA_LOGIN;

  if (!sesion && !enLogin) {
    // Una Server Action sin sesión (p. ej. la sesión expiró con la página abierta) no se
    // redirige: se deja llegar a la acción, que la rechaza con un mensaje claro. Una
    // redirección haría que el navegador reenviara el POST a /login y la interfaz
    // recibiría una respuesta vacía. No expone nada: las acciones y las consultas
    // comprueban la sesión por su cuenta.
    if (request.method === "POST" && request.headers.has("next-action")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(RUTA_LOGIN, request.url));
  }
  if (sesion && enLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  // Todo, salvo los recursos estáticos de Next.js y el icono.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
