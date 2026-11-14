/**
 * Carga los datos migrados desde Supabase (prisma/seed-data.json, extraído del
 * backup del 29-10-2026). Ese archivo NO se versiona: debe existir localmente.
 *
 * Es idempotente: conserva los id originales, omite las filas que ya existen
 * (`skipDuplicates`) y nunca borra datos, así que puede ejecutarse tanto en la
 * base local de Docker como en Neon. Al final ajusta las secuencias de los id
 * para que los nuevos registros no choquen con los importados.
 *
 * El backup tiene el modelo anterior a la fase 6. Al cargarlo se aplican las mismas
 * reglas que la migración `team_model_and_views` aplica a una base con datos:
 * - La selección de cada jugador se deduce de la nacionalidad de su ficha.
 * - Cada gol sube al equipo de su goleador.
 * - Los goles que solo constaban en el marcador del partido se añaden sin goleador.
 * - `posiciones_por_grupo` no se carga: ahora es una vista calculada.
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

const TABLAS = ["equipos", "jugadores", "detalle_jugadores", "partidos", "goles"] as const;

const normalizar = (texto: string) => texto.trim().toLowerCase();

async function main() {
  const d = data as Record<(typeof TABLAS)[number], Fila[]>;

  // Selección de cada jugador: la nacionalidad de su ficha coincide con el nombre del equipo.
  const equipoPorNombre = new Map(d.equipos.map((f) => [normalizar(f.nombre!), reqInt(f.id)]));
  const nacionalidadDe = new Map(
    d.detalle_jugadores.map((f) => [reqInt(f.jugador_id), f.nacionalidad]),
  );
  const equipoDeJugador = new Map<number, number | null>();
  const dorsalesUsados = new Set<string>();
  for (const f of [...d.jugadores].sort((a, b) => reqInt(a.id) - reqInt(b.id))) {
    const id = reqInt(f.id);
    const nacionalidad = nacionalidadDe.get(id);
    let equipoId = (nacionalidad && equipoPorNombre.get(normalizar(nacionalidad))) || null;
    // Regla del dorsal: si ya lo lleva otro jugador de esa selección, queda sin selección.
    const clave = `${equipoId}:${f.dorsal}`;
    if (equipoId !== null && dorsalesUsados.has(clave)) equipoId = null;
    else dorsalesUsados.add(clave);
    equipoDeJugador.set(id, equipoId);
  }

  // Goles del backup, cada uno con el equipo de su goleador.
  const equiposDelPartido = new Map(
    d.partidos.map((f) => [reqInt(f.id), [reqInt(f.local_id), reqInt(f.visitante_id)]]),
  );
  const goles = d.goles.map((f) => {
    const partidoId = reqInt(f.partido_id);
    const jugadorId = reqInt(f.jugador_id);
    const equipoId = equipoDeJugador.get(jugadorId) ?? null;
    if (equipoId === null || !equiposDelPartido.get(partidoId)?.includes(equipoId)) {
      throw new Error(
        `El gol ${f.id} es de un jugador que no pertenece a ninguno de los dos equipos del partido ${partidoId}.`,
      );
    }
    return {
      id: reqInt(f.id),
      partidoId,
      equipoId,
      jugadorId,
      minuto: reqInt(f.minuto),
      esPenal: bool(f.es_penal),
    };
  });

  // Goles que solo constaban en el marcador: se añaden sin goleador, y solo para los
  // partidos que se insertan en esta ejecución (así el seed sigue siendo idempotente).
  const partidosExistentes = new Set(
    (await prisma.partido.findMany({ select: { id: true } })).map((p) => p.id),
  );
  const golesSinGoleador = d.partidos
    .filter((f) => !partidosExistentes.has(reqInt(f.id)))
    .flatMap((f) => {
      const partidoId = reqInt(f.id);
      return [
        { equipoId: reqInt(f.local_id), guardados: int(f.goles_local) ?? 0 },
        { equipoId: reqInt(f.visitante_id), guardados: int(f.goles_visitante) ?? 0 },
      ].flatMap(({ equipoId, guardados }) => {
        const detallados = goles.filter(
          (g) => g.partidoId === partidoId && g.equipoId === equipoId,
        ).length;
        return Array.from({ length: Math.max(guardados - detallados, 0) }, () => ({
          partidoId,
          equipoId,
        }));
      });
    });

  const ahora = new Date();

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
        equipoId: equipoDeJugador.get(reqInt(f.id)) ?? null,
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
      data: d.partidos.map((f) => {
        const fecha = fechaSinZona(f.fecha);
        const tieneGoles = (int(f.goles_local) ?? 0) + (int(f.goles_visitante) ?? 0) > 0;
        return {
          id: reqInt(f.id),
          localId: reqInt(f.local_id),
          visitanteId: reqInt(f.visitante_id),
          fase: f.fase!,
          fecha,
          // Jugado si su fecha ya pasó o tiene goles (misma regla que la migración).
          jugado: (fecha !== null && fecha <= ahora) || tieneGoles,
        };
      }),
    }),
    goles: await prisma.gol.createMany({ skipDuplicates: true, data: goles }),
  };

  // Ajusta cada secuencia al id máximo para que el próximo INSERT no colisione.
  for (const tabla of TABLAS) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${tabla}"`,
    );
  }

  // Después de ajustar la secuencia: estos goles no tienen id en el backup.
  const { count: sinGoleador } = await prisma.gol.createMany({ data: golesSinGoleador });

  for (const [tabla, { count }] of Object.entries(resultados)) {
    console.log(`${tabla}: ${count} filas nuevas (de ${d[tabla as keyof typeof d].length})`);
  }
  console.log(`goles sin goleador (tomados del marcador): ${sinGoleador} filas nuevas`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
