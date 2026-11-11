"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { JugadorDTO } from "@/lib/jugadores";
import { prisma } from "@/lib/prisma";
import { jugadorSchema, type CampoJugador } from "@/lib/validacion";
import { aJugadorDTO } from "./data";

// NOTA DE SEGURIDAD: las Server Actions son endpoints HTTP públicos.
// Todavía no hay autenticación (fase pendiente del roadmap), así que cualquier
// visitante puede ejecutarlas. Por eso validamos siempre en el servidor.

export type ResultadoAccion<T> =
  | { ok: true; datos: T }
  | { ok: false; error: string; campos?: Partial<Record<CampoJugador, string>> };

function leerFormulario(formData: FormData, activoPorDefecto?: boolean) {
  return jugadorSchema.safeParse({
    nombre: formData.get("nombre") ?? "",
    posicion: formData.get("posicion") ?? "",
    dorsal: formData.get("dorsal") ?? "",
    fechaNacimiento: formData.get("fechaNacimiento") ?? "",
    // El Switch solo envía el campo cuando está activado.
    activo: activoPorDefecto ?? formData.has("activo"),
  });
}

function errorDeValidacion(
  issues: { path: PropertyKey[]; message: string }[],
): ResultadoAccion<never> {
  const campos: Partial<Record<CampoJugador, string>> = {};
  for (const issue of issues) {
    const campo = issue.path[0] as CampoJugador;
    campos[campo] ??= issue.message;
  }
  return { ok: false, error: "Revisa los datos del formulario.", campos };
}

function idValido(id: unknown): id is number {
  return Number.isInteger(id) && (id as number) > 0;
}

function codigoPrisma(error: unknown): string | null {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
}

function revalidarJugador(id?: number) {
  revalidatePath("/jugadores");
  if (id) revalidatePath(`/jugadores/${id}`);
}

export async function crearJugador(formData: FormData): Promise<ResultadoAccion<JugadorDTO>> {
  const datos = leerFormulario(formData, true);
  if (!datos.success) return errorDeValidacion(datos.error.issues);

  try {
    const jugador = await prisma.jugador.create({
      data: { ...datos.data, fechaNacimiento: new Date(`${datos.data.fechaNacimiento}T00:00:00Z`) },
    });
    revalidarJugador();
    return { ok: true, datos: aJugadorDTO(jugador) };
  } catch (error) {
    console.error("Error al registrar jugador:", error);
    return { ok: false, error: "No se pudo registrar al jugador. Inténtalo nuevamente." };
  }
}

export async function actualizarJugador(
  id: number,
  formData: FormData,
): Promise<ResultadoAccion<JugadorDTO>> {
  if (!idValido(id)) return { ok: false, error: "El identificador del jugador no es válido." };

  const datos = leerFormulario(formData);
  if (!datos.success) return errorDeValidacion(datos.error.issues);

  try {
    const jugador = await prisma.jugador.update({
      where: { id },
      data: { ...datos.data, fechaNacimiento: new Date(`${datos.data.fechaNacimiento}T00:00:00Z`) },
    });
    revalidarJugador(id);
    return { ok: true, datos: aJugadorDTO(jugador) };
  } catch (error) {
    if (codigoPrisma(error) === "P2025") {
      revalidarJugador(id);
      return { ok: false, error: "Este jugador ya no existe. Recarga la lista." };
    }
    console.error("Error al actualizar jugador:", error);
    return { ok: false, error: "No se pudo actualizar al jugador. Inténtalo nuevamente." };
  }
}

export async function eliminarJugador(id: number): Promise<ResultadoAccion<{ id: number }>> {
  if (!idValido(id)) return { ok: false, error: "El identificador del jugador no es válido." };

  try {
    // detalle_jugadores se elimina en cascada (ON DELETE CASCADE).
    await prisma.jugador.delete({ where: { id } });
    revalidarJugador(id);
    return { ok: true, datos: { id } };
  } catch (error) {
    const codigo = codigoPrisma(error);
    if (codigo === "P2025") {
      revalidarJugador(id);
      return { ok: false, error: "Este jugador ya había sido eliminado." };
    }
    if (codigo === "P2003") {
      // goles.jugador_id → jugadores.id usa ON DELETE NO ACTION.
      return {
        ok: false,
        error: "No se puede eliminar: el jugador tiene goles registrados en partidos.",
      };
    }
    console.error("Error al eliminar jugador:", error);
    return { ok: false, error: "No se pudo eliminar al jugador. Inténtalo nuevamente." };
  }
}
