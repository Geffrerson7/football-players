/**
 * Carga los datos migrados desde Supabase (prisma/seed-data.json, extraído del
 * backup del 29-10-2026). Ese archivo NO se versiona: debe existir localmente.
 *
 * Es idempotente: conserva los id originales, omite las filas que ya existen
 * (`skipDuplicates`) y nunca borra datos, así que puede ejecutarse tanto en la
 * base local de Docker como en Neon. Al final ajusta las secuencias de los id
 * para que los nuevos registros no choquen con los importados.
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

type Fila = Record<string, string | null>;

// Se lee en tiempo de ejecución (no con `import`) para que el build no dependa
// de un archivo que no está en el repositorio.
const RUTA_DATOS = new URL("./seed-data.json", import.meta.url);
if (!existsSync(RUTA_DATOS)) {
  throw new Error(
    "No se encontró prisma/seed-data.json. Este archivo no se versiona: colócalo en la carpeta prisma/ antes de ejecutar el seed.",
  );
}
const data: unknown = JSON.parse(readFileSync(RUTA_DATOS, "utf8"));

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL en el entorno.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const int = (v: string | null) => (v === null ? null : Number.parseInt(v, 10));
const reqInt = (v: string | null) => {
  const n = int(v);
  if (n === null || Number.isNaN(n)) throw new Error(`Entero requerido, recibido: ${v}`);
  return n;
};
const bool = (v: string | null) => (v === null ? null : v === "t");
// DATE ("2007-07-13") y TIMESTAMP sin zona ("2026-01-10 10:15:00"):
// se interpretan como UTC para conservar exactamente el valor original.
const fechaSinZona = (v: string | null) =>
  v === null ? null : new Date(`${v.replace(" ", "T")}${v.length > 10 ? "" : "T00:00:00"}Z`);
// TIMESTAMPTZ ("2026-10-20 15:04:05.123+00")
const fechaConZona = (v: string | null) =>
  v === null ? null : new Date(v.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));

const TABLAS = [
  "equipos",
  "jugadores",
  "detalle_jugadores",
  "partidos",
  "goles",
  "posiciones_por_grupo",
] as const;

async function main() {
  const d = data as Record<(typeof TABLAS)[number], Fila[]>;

  const resultados = {
    equipos: await prisma.equipo.createMany({
      skipDuplicates: true,
      data: d.equipos.map((f) => ({
        id: reqInt(f.id),
        nombre: f.nombre!,
        confederacion: f.confederacion!,
        grupo: f.grupo!,
        rankingFifa: reqInt(f.ranking_fifa),
        clasificado: bool(f.clasificado),
        fechaCreacion: fechaSinZona(f.fecha_creacion),
      })),
    }),
    jugadores: await prisma.jugador.createMany({
      skipDuplicates: true,
      data: d.jugadores.map((f) => ({
        id: reqInt(f.id),
        nombre: f.nombre!,
        posicion: f.posicion,
        dorsal: reqInt(f.dorsal),
        activo: bool(f.activo),
        fechaNacimiento: fechaSinZona(f.fecha_nacimiento),
      })),
    }),
    detalle_jugadores: await prisma.detalleJugador.createMany({
      skipDuplicates: true,
      data: d.detalle_jugadores.map((f) => ({
        id: reqInt(f.id),
        jugadorId: reqInt(f.jugador_id),
        nacionalidad: f.nacionalidad,
        alturaCm: int(f.altura_cm),
        pesoKg: f.peso_kg,
        pieHabil: f.pie_habil,
        clubActual: f.club_actual,
        fotoUrl: f.foto_url,
        biografia: f.biografia,
        fechaActualizacion: fechaConZona(f.fecha_actualizacion) ?? new Date(),
      })),
    }),
    partidos: await prisma.partido.createMany({
      skipDuplicates: true,
      data: d.partidos.map((f) => ({
        id: reqInt(f.id),
        localId: reqInt(f.local_id),
        visitanteId: reqInt(f.visitante_id),
        golesLocal: int(f.goles_local),
        golesVisitante: int(f.goles_visitante),
        fase: f.fase!,
        fecha: fechaSinZona(f.fecha),
      })),
    }),
    goles: await prisma.gol.createMany({
      skipDuplicates: true,
      data: d.goles.map((f) => ({
        id: reqInt(f.id),
        partidoId: reqInt(f.partido_id),
        jugadorId: reqInt(f.jugador_id),
        minuto: reqInt(f.minuto),
        esPenal: bool(f.es_penal),
      })),
    }),
    posiciones_por_grupo: await prisma.posicionGrupo.createMany({
      skipDuplicates: true,
      data: d.posiciones_por_grupo.map((f) => ({
        id: reqInt(f.id),
        equipoId: reqInt(f.equipo_id),
        grupo: f.grupo!,
        pj: reqInt(f.pj),
        pg: reqInt(f.pg),
        pe: reqInt(f.pe),
        pp: reqInt(f.pp),
        gf: reqInt(f.gf),
        gc: reqInt(f.gc),
        puntos: reqInt(f.puntos),
      })),
    }),
  };

  // Ajusta cada secuencia al id máximo para que el próximo INSERT no colisione.
  for (const tabla of TABLAS) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${tabla}"`,
    );
  }

  for (const [tabla, { count }] of Object.entries(resultados)) {
    console.log(`${tabla}: ${count} filas nuevas (de ${d[tabla as keyof typeof d].length})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
