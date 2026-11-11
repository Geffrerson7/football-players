# Football Players

Aplicación de gestión de jugadores de fútbol construida con **Next.js (App Router)**, **TypeScript**, **Prisma ORM** y **PostgreSQL**, con una estética futbolística editorial.

- **Desarrollo:** PostgreSQL 17 en Docker.
- **Producción:** [Neon](https://neon.tech) (PostgreSQL serverless).

## Funcionalidades

- **Plantel:** listado de jugadores ordenado por dorsal, con filtro por posición y paginación.
- **Gestión de jugadores:** registrar, editar (incluido el estado activo/inactivo) y eliminar.
- **Perfil del jugador:** ficha deportiva, edad calculada y biografía.
- **Tema claro / oscuro / sistema.**
- **Página 404 personalizada.**

> Las secciones **Equipos** y **Partidos** aparecen en la navegación, pero todavía no están implementadas. Los datos (`equipos`, `partidos`, `goles`, `posiciones_por_grupo`) ya existen en la base de datos.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Lenguaje | TypeScript |
| UI | React 19, HeroUI v3, Tailwind CSS v4, lucide-react, sonner |
| Datos | Prisma ORM 7 (`@prisma/adapter-pg`), PostgreSQL 17 |
| Validación | zod (en el servidor; el cliente repite las reglas básicas) |
| Tema | next-themes |
| Gestor de paquetes | pnpm |

## Requisitos

- Node.js 20.19 o superior (probado con Node 24)
- pnpm
- Docker Desktop (para la base de datos de desarrollo)

## Puesta en marcha (desarrollo)

```bash
# 1. Dependencias (genera también el cliente de Prisma)
pnpm install

# 2. Variables de entorno: copia el ejemplo y reemplaza <password>
#    (en POSTGRES_PASSWORD y en DATABASE_URL) por una contraseña local
cp .env.example .env

# 3. Base de datos en Docker
pnpm db:up

# 4. Crear las tablas (y, si tienes prisma/seed-data.json, cargar los datos)
pnpm db:migrate
pnpm db:seed

# 5. Servidor de desarrollo
pnpm dev
```

Abre la URL que muestra Next.js (por defecto `http://localhost:3000`).

### Datos iniciales

`prisma/seed.ts` carga los datos migrados desde el backup de Supabase del 29-10-2026 (12 jugadores, 11 fichas, 10 equipos, 10 partidos, 10 goles y 10 posiciones) a partir de `prisma/seed-data.json`.

**`prisma/seed-data.json` no está en el repositorio.** Para cargar los datos, coloca ese archivo en `prisma/` antes de ejecutar `pnpm db:seed`; sin él, el seed se detiene con un mensaje explicativo y la base queda vacía.

El seed:

- conserva los `id` originales y ajusta las secuencias;
- es **idempotente**: omite las filas que ya existen y **nunca borra datos**.

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Comprobación de tipos con TypeScript |
| `pnpm db:up` / `pnpm db:down` | Levantar / detener PostgreSQL en Docker |
| `pnpm db:migrate` | Crear y aplicar migraciones (desarrollo) |
| `pnpm db:deploy` | Aplicar migraciones pendientes (producción) |
| `pnpm db:seed` | Cargar los datos iniciales |
| `pnpm db:studio` | Explorar los datos con Prisma Studio |

`pnpm db:down` conserva los datos (volumen `pgdata`). Para borrarlos por completo: `docker compose down -v`.

## Despliegue con Neon

1. Crea un proyecto en Neon y copia sus dos cadenas de conexión.
2. Configura en el entorno de producción (por ejemplo, Vercel):
   - `DATABASE_URL`: conexión **con pooling** (host con `-pooler`), la que usa la app.
   - `DIRECT_URL`: conexión **directa** (host sin `-pooler`), la que usa la CLI de Prisma.
3. Aplica el esquema y, si quieres los datos iniciales, ejecuta el seed apuntando a Neon:

   ```bash
   pnpm db:deploy
   pnpm db:seed
   ```

`prisma.config.ts` usa `DIRECT_URL` para la CLI cuando existe y, si no, `DATABASE_URL`.

## Estructura

```text
prisma/
├── schema.prisma          # Modelos (mapeados a las tablas originales)
├── migrations/            # Migración inicial (incluye restricciones CHECK)
├── seed.ts                # Seed idempotente
└── seed-data.json         # Datos migrados desde Supabase (local, no versionado)
src/
├── app/
│   ├── layout.tsx         # Layout raíz, fuentes, tema, navegación
│   ├── page.tsx           # Portada
│   ├── not-found.tsx      # 404
│   └── jugadores/
│       ├── (lista)/       # Listado (page, loading, error)
│       ├── [id]/          # Perfil del jugador
│       ├── actions.ts     # Server Actions: crear, editar, eliminar
│       └── data.ts        # Consultas (solo servidor)
├── components/            # Navbar, Footer, ThemeSwitcher, jugadores/*
├── lib/                   # Prisma, utilidades de dominio y validación
└── generated/prisma/      # Cliente de Prisma generado (no se versiona)
```

## Seguridad

- La base de datos solo se accede desde el servidor (Server Components y Server Actions). El navegador no recibe credenciales.
- **Todavía no hay autenticación.** Las Server Actions son endpoints públicos: cualquier visitante puede crear, editar o eliminar jugadores. Se validan siempre en el servidor, pero el control de acceso es la siguiente tarea pendiente.
- Nunca subas `.env` ni los backups de la base de datos al repositorio (ambos están en `.gitignore`).

## Contribuir

1. Crea una rama desde `main` (`feat/...`, `fix/...`).
2. Antes de abrir el PR: `pnpm lint`, `pnpm typecheck` y `pnpm build`.
3. Usa commits semánticos (`feat: ...`, `fix: ...`).
