-- Restricciones CHECK de jugadores (H-06 y fase 3). Prisma no puede declararlas en schema.prisma.
-- Repiten en la base de datos las reglas de src/lib/validacion.ts, para que tampoco
-- puedan entrar datos inválidos por otras vías (SQL directo, seed, Prisma Studio).
-- Si alguna fila existente las incumple, la migración falla sin aplicar cambios.

ALTER TABLE "jugadores" ADD CONSTRAINT "chk_dorsal_rango" CHECK ("dorsal" BETWEEN 1 AND 99);

-- Se admite un día de margen sobre CURRENT_DATE: la aplicación valida «no futura» con la
-- fecha local del servidor, que puede ir un día por delante de la fecha UTC de la base.
ALTER TABLE "jugadores" ADD CONSTRAINT "chk_fecha_nacimiento_rango" CHECK (
  ("fecha_nacimiento" IS NULL)
  OR ("fecha_nacimiento" >= DATE '1900-01-01' AND "fecha_nacimiento" <= CURRENT_DATE + 1)
);
