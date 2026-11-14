-- Fase 6 · Modelo de datos coherente (H-07, H-31, H-32, H-33, H-34, H-35).
--
-- Esta migración transforma datos existentes, así que está escrita a mano y el orden
-- importa. En una base vacía (desarrollo, pruebas) los pasos de datos no hacen nada:
-- allí es `prisma/seed.ts` quien aplica las mismas reglas al cargar el backup.
--
-- Prisma ejecuta la migración dentro de una transacción: si un paso falla, no cambia nada.

-- ---------------------------------------------------------------------------
-- 1. H-31 · Cada jugador pertenece a una selección (`jugadores.equipo_id`)
-- ---------------------------------------------------------------------------

ALTER TABLE "jugadores" ADD COLUMN "equipo_id" INTEGER;

-- La selección se deduce de la nacionalidad de la ficha, que coincide con el nombre
-- del equipo. Quien no tenga ficha, o cuya nacionalidad no esté entre los equipos del
-- torneo, queda sin selección (NULL) y se puede asignar después desde la aplicación.
--
-- H-07 · «Limpiar duplicados»: si dos jugadores de la misma selección compartieran
-- dorsal, solo el más antiguo (menor id) recibe la selección. El otro queda sin
-- selección en lugar de hacer fallar la restricción UNIQUE de más abajo.
UPDATE "jugadores" AS j
SET "equipo_id" = c."equipo_id"
FROM (
  SELECT
    j2."id",
    e."id" AS "equipo_id",
    ROW_NUMBER() OVER (PARTITION BY e."id", j2."dorsal" ORDER BY j2."id") AS "orden"
  FROM "jugadores" j2
  JOIN "detalle_jugadores" d ON d."jugador_id" = j2."id"
  JOIN "equipos" e ON lower(btrim(e."nombre")) = lower(btrim(d."nacionalidad"))
) AS c
WHERE c."id" = j."id" AND c."orden" = 1;

ALTER TABLE "jugadores"
  ADD CONSTRAINT "jugadores_equipo_id_fkey"
  FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- H-07 · Regla del dorsal: único dentro de cada selección. Los NULL cuentan como
-- distintos, así que los jugadores sin selección pueden repetir dorsal.
-- Este índice también sirve de índice de la clave foránea `equipo_id` (H-35).
CREATE UNIQUE INDEX "jugadores_equipo_id_dorsal_key" ON "jugadores"("equipo_id", "dorsal");

-- ---------------------------------------------------------------------------
-- 2. H-32 · El marcador se calcula a partir de `goles`
-- ---------------------------------------------------------------------------

-- Cada gol indica a qué equipo le sube al marcador. El goleador y el minuto pasan a ser
-- opcionales, para poder registrar goles de los que solo se conoce el equipo.
ALTER TABLE "goles"
  ADD COLUMN "equipo_id" INTEGER,
  ALTER COLUMN "jugador_id" DROP NOT NULL,
  ALTER COLUMN "minuto" DROP NOT NULL;

-- Goles ya registrados: suben al equipo de su goleador, si juega ese partido.
UPDATE "goles" AS g
SET "equipo_id" = j."equipo_id"
FROM "jugadores" j, "partidos" p
WHERE j."id" = g."jugador_id"
  AND p."id" = g."partido_id"
  AND j."equipo_id" IN (p."local_id", p."visitante_id");

DO $$
DECLARE
  sin_equipo INTEGER;
BEGIN
  SELECT count(*) INTO sin_equipo FROM "goles" WHERE "equipo_id" IS NULL;
  IF sin_equipo > 0 THEN
    RAISE EXCEPTION
      'Hay % gol(es) cuyo goleador no pertenece a ninguno de los dos equipos del partido. Corrige esos goles (o la nacionalidad del jugador) antes de migrar.',
      sin_equipo;
  END IF;
END $$;

-- El marcador guardado en `partidos` tenía más goles que la tabla `goles` (solo se
-- habían detallado algunos). Para no perder esos resultados, la diferencia se añade
-- como goles sin goleador ni minuto.
-- Si un equipo ya tiene en `goles` más goles de los que decía el marcador, manda `goles`.
INSERT INTO "goles" ("partido_id", "equipo_id")
SELECT p."id", lado."equipo_id"
FROM "partidos" p
CROSS JOIN LATERAL (
  VALUES
    (p."local_id", COALESCE(p."goles_local", 0)),
    (p."visitante_id", COALESCE(p."goles_visitante", 0))
) AS lado("equipo_id", "guardados")
CROSS JOIN LATERAL generate_series(
  1,
  lado."guardados" - (
    SELECT count(*)::int FROM "goles" g
    WHERE g."partido_id" = p."id" AND g."equipo_id" = lado."equipo_id"
  )
);

ALTER TABLE "goles" ALTER COLUMN "equipo_id" SET NOT NULL;

ALTER TABLE "goles"
  ADD CONSTRAINT "goles_equipo_id_fkey"
  FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "goles"
  ADD CONSTRAINT "chk_gol_minuto" CHECK (("minuto" IS NULL) OR ("minuto" BETWEEN 1 AND 130));

-- Sin goles no se distingue un 0-0 de un partido por jugar: se guarda de forma explícita.
ALTER TABLE "partidos" ADD COLUMN "jugado" BOOLEAN NOT NULL DEFAULT false;

-- Los partidos existentes cuentan como jugados si su fecha ya pasó o tienen goles.
UPDATE "partidos" AS p
SET "jugado" = true
WHERE (p."fecha" IS NOT NULL AND p."fecha" <= (now() AT TIME ZONE 'UTC'))
   OR EXISTS (SELECT 1 FROM "goles" g WHERE g."partido_id" = p."id");

ALTER TABLE "partidos" DROP COLUMN "goles_local", DROP COLUMN "goles_visitante";

ALTER TABLE "partidos"
  ADD CONSTRAINT "chk_partido_equipos_distintos" CHECK ("local_id" <> "visitante_id");

-- El equipo de un gol debe ser uno de los dos del partido. Una restricción CHECK no
-- puede consultar otra tabla, así que se comprueba con un trigger.
CREATE FUNCTION "comprobar_equipo_del_gol"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "partidos" p
    WHERE p."id" = NEW."partido_id" AND NEW."equipo_id" IN (p."local_id", p."visitante_id")
  ) THEN
    RAISE EXCEPTION 'El equipo % no juega el partido %.', NEW."equipo_id", NEW."partido_id"
      USING ERRCODE = 'check_violation', CONSTRAINT = 'chk_gol_equipo_del_partido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_gol_equipo_del_partido"
  BEFORE INSERT OR UPDATE OF "partido_id", "equipo_id" ON "goles"
  FOR EACH ROW EXECUTE FUNCTION "comprobar_equipo_del_gol"();

-- ---------------------------------------------------------------------------
-- 3. H-34 · Tipos de columna coherentes
-- ---------------------------------------------------------------------------

-- TIMESTAMP → TIMESTAMPTZ. Los valores guardados se interpretan como UTC (igual que al
-- importar el backup), sin depender de la zona horaria de la sesión que migra.
ALTER TABLE "equipos"
  ALTER COLUMN "fecha_creacion" SET DATA TYPE TIMESTAMPTZ(6) USING "fecha_creacion" AT TIME ZONE 'UTC';

ALTER TABLE "partidos"
  ALTER COLUMN "fecha" SET DATA TYPE TIMESTAMPTZ(6) USING "fecha" AT TIME ZONE 'UTC';

-- El grupo era CHAR(1) en `equipos` y CHAR(2) en `posiciones_por_grupo` ("A "). Esa
-- tabla desaparece en el paso 5 y la vista que la sustituye lee el grupo de `equipos`.

-- ---------------------------------------------------------------------------
-- 4. H-35 · Índices en las claves foráneas
-- ---------------------------------------------------------------------------

CREATE INDEX "goles_partido_id_idx" ON "goles"("partido_id");
CREATE INDEX "goles_equipo_id_idx" ON "goles"("equipo_id");
CREATE INDEX "goles_jugador_id_idx" ON "goles"("jugador_id");
CREATE INDEX "partidos_local_id_idx" ON "partidos"("local_id");
CREATE INDEX "partidos_visitante_id_idx" ON "partidos"("visitante_id");

-- ---------------------------------------------------------------------------
-- 5. H-32 y H-33 · Vistas calculadas
-- ---------------------------------------------------------------------------

-- La tabla de posiciones se rellenaba a mano y contradecía a `partidos`.
DROP TABLE "posiciones_por_grupo";

-- Marcador de cada partido, contado desde `goles`.
CREATE VIEW "marcadores" AS
SELECT
  p."id" AS "partido_id",
  (count(g."id") FILTER (WHERE g."equipo_id" = p."local_id"))::int AS "goles_local",
  (count(g."id") FILTER (WHERE g."equipo_id" = p."visitante_id"))::int AS "goles_visitante"
FROM "partidos" p
LEFT JOIN "goles" g ON g."partido_id" = p."id"
GROUP BY p."id";

-- Tabla de posiciones: una fila por equipo, calculada con los partidos jugados de la
-- fase de grupos. Conserva el nombre de la tabla que sustituye.
CREATE VIEW "posiciones_por_grupo" AS
WITH "resultados" AS (
  SELECT p."local_id" AS "equipo_id", m."goles_local" AS "gf", m."goles_visitante" AS "gc"
  FROM "partidos" p
  JOIN "marcadores" m ON m."partido_id" = p."id"
  WHERE p."jugado" AND p."fase" = 'Grupos'
  UNION ALL
  SELECT p."visitante_id", m."goles_visitante", m."goles_local"
  FROM "partidos" p
  JOIN "marcadores" m ON m."partido_id" = p."id"
  WHERE p."jugado" AND p."fase" = 'Grupos'
)
SELECT
  e."id" AS "equipo_id",
  e."grupo",
  count(r."equipo_id")::int AS "pj",
  (count(*) FILTER (WHERE r."gf" > r."gc"))::int AS "pg",
  (count(*) FILTER (WHERE r."gf" = r."gc"))::int AS "pe",
  (count(*) FILTER (WHERE r."gf" < r."gc"))::int AS "pp",
  COALESCE(sum(r."gf"), 0)::int AS "gf",
  COALESCE(sum(r."gc"), 0)::int AS "gc",
  (3 * count(*) FILTER (WHERE r."gf" > r."gc") + count(*) FILTER (WHERE r."gf" = r."gc"))::int AS "puntos"
FROM "equipos" e
LEFT JOIN "resultados" r ON r."equipo_id" = e."id"
GROUP BY e."id", e."grupo";
