import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El cliente de Prisma usa el driver `pg` de Node; no debe empaquetarse.
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
};

export default nextConfig;
