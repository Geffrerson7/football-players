import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";
import { ROLES } from "./roles";

/**
 * URL pública de la aplicación. En Vercel, si no se define BETTER_AUTH_URL, se usa
 * la del despliegue (así también funcionan las vistas previas).
 */
function urlBase(): string | undefined {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return undefined;
}

function crearAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Falta la variable de entorno BETTER_AUTH_SECRET. Copia .env.example a .env y configúrala.",
    );
  }

  return betterAuth({
    secret,
    baseURL: urlBase(),
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      // No hay registro público: los usuarios se crean con `pnpm db:usuarios`.
      disableSignUp: true,
    },
    user: {
      additionalFields: {
        role: {
          type: [...ROLES],
          required: false,
          defaultValue: "demo",
          // Campo del servidor: ninguna petición puede asignar el rol.
          input: false,
        },
      },
    },
    // Debe ser el último plugin: escribe las cookies de sesión desde las Server Actions.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof crearAuth>;

const globalParaAuth = globalThis as unknown as { auth?: Auth };

/**
 * Instancia perezosa de Better Auth: se crea en el primer uso, no al importar el
 * módulo. Así `next build` no necesita BETTER_AUTH_SECRET ni DATABASE_URL.
 *
 * No se monta el manejador HTTP de Better Auth (`/api/auth/*`): el inicio y el cierre
 * de sesión se hacen con Server Actions (src/app/login/actions.ts), de modo que no
 * quedan expuestos endpoints que la aplicación no usa.
 */
export function obtenerAuth(): Auth {
  if (!globalParaAuth.auth) globalParaAuth.auth = crearAuth();
  return globalParaAuth.auth;
}
