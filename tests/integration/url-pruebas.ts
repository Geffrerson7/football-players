const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Devuelve TEST_DATABASE_URL solo si es seguro usarla: las pruebas vacían todas
 * las tablas, así que nunca deben tocar la base de desarrollo ni la de Neon.
 */
export function urlDePrueba(): string {
  const valor = process.env.TEST_DATABASE_URL;
  if (!valor) throw new Error("Falta TEST_DATABASE_URL.");

  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new Error("TEST_DATABASE_URL no es una URL válida.");
  }

  const nombre = nombreBaseDeDatos(url);
  if (!HOSTS_LOCALES.has(url.hostname) || !nombre.endsWith("_test")) {
    throw new Error(
      "Por seguridad, TEST_DATABASE_URL debe apuntar a localhost y a una base de datos cuyo nombre termine en _test.",
    );
  }
  return valor;
}

export function nombreBaseDeDatos(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}
