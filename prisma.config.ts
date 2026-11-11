import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI (migrate, db seed, studio) usa la conexión directa si existe.
// En Neon, DATABASE_URL apunta al pooler y DIRECT_URL al host directo.
// En desarrollo con Docker basta con DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Sin `env()` para que `prisma generate` (postinstall) no falle cuando aún no hay .env.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
