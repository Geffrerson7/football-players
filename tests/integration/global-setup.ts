import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { nombreBaseDeDatos, urlDePrueba } from "./url-pruebas";

const CLI_PRISMA = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));

/** Crea la base de pruebas si no existe y le aplica las migraciones. Se ejecuta una vez. */
export default async function setup() {
  const valor = urlDePrueba();
  const url = new URL(valor);
  const nombre = nombreBaseDeDatos(url);
  if (!/^[a-z0-9_]+$/.test(nombre)) {
    throw new Error("El nombre de la base de pruebas solo puede tener minúsculas, números y _.");
  }

  // Conexión a la base de mantenimiento `postgres` para poder crear la de pruebas.
  const admin = new URL(valor);
  admin.pathname = "/postgres";
  admin.search = "";
  const cliente = new Client({ connectionString: admin.toString() });
  await cliente.connect();
  try {
    const { rowCount } = await cliente.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      nombre,
    ]);
    if (!rowCount) await cliente.query(`CREATE DATABASE "${nombre}"`);
  } finally {
    await cliente.end();
  }

  // DATABASE_URL y DIRECT_URL se fuerzan a la base de pruebas: prisma.config.ts carga
  // el .env con dotenv, que no sobrescribe variables ya definidas.
  execFileSync(process.execPath, [CLI_PRISMA, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: valor, DIRECT_URL: valor },
    stdio: "pipe",
  });
}
