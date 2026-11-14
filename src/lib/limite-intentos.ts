import "server-only";

const VENTANA_MS = 60_000;
const MAX_INTENTOS = 5;
const MAX_CLAVES = 10_000;

const intentos = new Map<string, { cantidad: number; expira: number }>();

/**
 * Freno básico contra la fuerza bruta en el inicio de sesión: como máximo
 * 5 intentos por minuto para una misma clave (IP + correo).
 *
 * Vive en la memoria del proceso: en un entorno serverless cada instancia lleva su
 * propia cuenta, así que es una protección de «mejor esfuerzo», no una garantía.
 * Devuelve false si se superó el límite.
 */
export function registrarIntento(clave: string, ahora = Date.now()): boolean {
  if (intentos.size >= MAX_CLAVES) {
    for (const [k, v] of intentos) if (v.expira <= ahora) intentos.delete(k);
    if (intentos.size >= MAX_CLAVES) intentos.clear();
  }

  const actual = intentos.get(clave);
  if (!actual || actual.expira <= ahora) {
    intentos.set(clave, { cantidad: 1, expira: ahora + VENTANA_MS });
    return true;
  }
  actual.cantidad += 1;
  return actual.cantidad <= MAX_INTENTOS;
}

export function reiniciarIntentos(clave?: string) {
  if (clave === undefined) intentos.clear();
  else intentos.delete(clave);
}
