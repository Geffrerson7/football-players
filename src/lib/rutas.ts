const ENTERO_MAXIMO = 2_147_483_647; // rango de INTEGER en Postgres

/** Convierte el segmento `[id]` de una ruta en un id válido, o null si no lo es. */
export function idDeRuta(texto: string): number | null {
  if (!/^\d+$/.test(texto)) return null;
  const id = Number(texto);
  return Number.isSafeInteger(id) && id >= 1 && id <= ENTERO_MAXIMO ? id : null;
}
