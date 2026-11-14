import { z } from "zod";
import {
  DORSAL_MAX,
  DORSAL_MIN,
  FECHA_MINIMA,
  POSICIONES,
  SIN_EQUIPO,
  hoyISO,
} from "./jugadores";

const MENSAJE_DORSAL = `Ingresa un dorsal entre ${DORSAL_MIN} y ${DORSAL_MAX}.`;
const MENSAJE_EQUIPO = "Elige una selección válida.";
const ENTERO_MAXIMO = 2_147_483_647; // rango de INTEGER en Postgres

/** Reglas de un jugador. El servidor siempre las aplica, aunque el cliente ya haya validado. */
export const jugadorSchema = z.object({
  nombre: z
    .string({ error: "Ingresa el nombre." })
    .trim()
    .min(1, "Ingresa el nombre.")
    .max(255, "El nombre no puede superar los 255 caracteres."),
  posicion: z.enum(POSICIONES, { error: "Selecciona una posición válida." }),
  dorsal: z.coerce
    .number({ error: MENSAJE_DORSAL })
    .int(MENSAJE_DORSAL)
    .min(DORSAL_MIN, MENSAJE_DORSAL)
    .max(DORSAL_MAX, MENSAJE_DORSAL),
  fechaNacimiento: z.iso
    .date({ error: "Ingresa una fecha de nacimiento válida." })
    .refine((fecha) => fecha >= FECHA_MINIMA && fecha <= hoyISO(), {
      error: "La fecha de nacimiento no puede ser futura ni anterior a 1900.",
      // Solo comprueba el rango si el formato es válido, para no sumar un segundo error engañoso.
      when: (payload) => payload.issues.length === 0,
    }),
  activo: z.boolean(),
  // Opcional: vacío o «ninguna» significa que el jugador no tiene selección.
  equipoId: z.preprocess(
    (valor) => (valor === "" || valor === SIN_EQUIPO || valor === undefined ? null : valor),
    z.coerce
      .number({ error: MENSAJE_EQUIPO })
      .int(MENSAJE_EQUIPO)
      .min(1, MENSAJE_EQUIPO)
      .max(ENTERO_MAXIMO, MENSAJE_EQUIPO)
      .nullable(),
  ),
});

export type JugadorInput = z.infer<typeof jugadorSchema>;
export type CampoJugador = keyof JugadorInput;
