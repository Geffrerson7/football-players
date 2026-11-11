-- CreateTable
CREATE TABLE "jugadores" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "posicion" VARCHAR(50),
    "dorsal" INTEGER NOT NULL,
    "activo" BOOLEAN DEFAULT true,
    "fecha_nacimiento" DATE,

    CONSTRAINT "jugadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_jugadores" (
    "id" SERIAL NOT NULL,
    "jugador_id" INTEGER NOT NULL,
    "nacionalidad" VARCHAR(100),
    "altura_cm" INTEGER,
    "peso_kg" DECIMAL(5,2),
    "pie_habil" VARCHAR(10),
    "club_actual" VARCHAR(150),
    "foto_url" TEXT,
    "biografia" TEXT,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detalle_jugadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "confederacion" VARCHAR(25) NOT NULL,
    "grupo" CHAR(1) NOT NULL,
    "ranking_fifa" INTEGER NOT NULL,
    "clasificado" BOOLEAN DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partidos" (
    "id" SERIAL NOT NULL,
    "local_id" INTEGER NOT NULL,
    "visitante_id" INTEGER NOT NULL,
    "goles_local" INTEGER DEFAULT 0,
    "goles_visitante" INTEGER DEFAULT 0,
    "fase" VARCHAR(30) NOT NULL,
    "fecha" TIMESTAMP(6),

    CONSTRAINT "partidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goles" (
    "id" SERIAL NOT NULL,
    "partido_id" INTEGER NOT NULL,
    "jugador_id" INTEGER NOT NULL,
    "minuto" INTEGER NOT NULL,
    "es_penal" BOOLEAN,

    CONSTRAINT "goles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posiciones_por_grupo" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "grupo" CHAR(2) NOT NULL,
    "pj" INTEGER NOT NULL DEFAULT 0,
    "pg" INTEGER NOT NULL DEFAULT 0,
    "pe" INTEGER NOT NULL DEFAULT 0,
    "pp" INTEGER NOT NULL DEFAULT 0,
    "gf" INTEGER NOT NULL DEFAULT 0,
    "gc" INTEGER NOT NULL DEFAULT 0,
    "puntos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "posiciones_por_grupo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "detalle_jugadores_jugador_id_key" ON "detalle_jugadores"("jugador_id");

-- AddForeignKey
ALTER TABLE "detalle_jugadores" ADD CONSTRAINT "detalle_jugadores_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "jugadores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "equipos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "equipos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goles" ADD CONSTRAINT "goles_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partidos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goles" ADD CONSTRAINT "goles_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "jugadores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "posiciones_por_grupo" ADD CONSTRAINT "posiciones_por_grupo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Restricciones CHECK del esquema original de Supabase (Prisma no puede declararlas en schema.prisma)
ALTER TABLE "detalle_jugadores" ADD CONSTRAINT "chk_altura_positiva" CHECK (("altura_cm" IS NULL) OR ("altura_cm" > 0));
ALTER TABLE "detalle_jugadores" ADD CONSTRAINT "chk_peso_positivo" CHECK (("peso_kg" IS NULL) OR ("peso_kg" > 0));
ALTER TABLE "detalle_jugadores" ADD CONSTRAINT "chk_pie_habil" CHECK (("pie_habil" IS NULL) OR ("pie_habil" IN ('Izquierdo', 'Derecho', 'Ambidiestro')));
