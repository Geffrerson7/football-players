import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { parse } from "dotenv";
import { defineConfig } from "vitest/config";

const raiz = fileURLToPath(new URL("./", import.meta.url));

// TEST_DATABASE_URL puede venir del entorno (CI) o del .env local.
// Solo se lee esa variable: DATABASE_URL y DIRECT_URL del .env nunca llegan a las pruebas.
const envLocal = existsSync(`${raiz}.env`) ? parse(readFileSync(`${raiz}.env`)) : {};
const urlPruebas = process.env.TEST_DATABASE_URL ?? envLocal.TEST_DATABASE_URL;

if (urlPruebas) {
  // El globalSetup se ejecuta en este proceso, no en los workers.
  process.env.TEST_DATABASE_URL = urlPruebas;
} else if (process.env.CI) {
  throw new Error("En CI es obligatorio definir TEST_DATABASE_URL para las pruebas de integración.");
} else if (!process.env.AVISO_SIN_BD_MOSTRADO) {
  // Este archivo se re-ejecuta por cada proyecto; el aviso solo se muestra una vez.
  process.env.AVISO_SIN_BD_MOSTRADO = "1";
  console.warn(
    "\n⚠ TEST_DATABASE_URL no está definida: se omiten las pruebas de integración (ver README).\n",
  );
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": `${raiz}src`,
      // `server-only` lanza un error fuera del entorno de React Server Components.
      "server-only": `${raiz}tests/stubs/server-only.ts`,
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "components",
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["tests/components/setup.ts"],
        },
      },
      ...(urlPruebas
        ? [
            {
              test: {
                name: "integration",
                environment: "node",
                include: ["tests/integration/**/*.test.ts"],
                globalSetup: ["tests/integration/global-setup.ts"],
                setupFiles: ["tests/integration/setup.ts"],
                // Todas las pruebas comparten la misma base de datos.
                fileParallelism: false,
                testTimeout: 20_000,
                hookTimeout: 60_000,
              },
            },
          ]
        : []),
    ],
  },
});
