# Football Players

Aplicación de gestión de jugadores de fútbol construida con **Next.js (App Router)**, **TypeScript**, **Prisma ORM** y **PostgreSQL**, con una estética futbolística editorial.

- **Desarrollo:** PostgreSQL 17 en Docker.
- **Producción:** [Neon](https://neon.tech) (PostgreSQL serverless).

## Funcionalidades

- **Inicio de sesión obligatorio** con dos roles: `admin` (gestiona el plantel) y `demo` (solo lectura, con acceso desde el botón «Entrar como demo»).
- **Plantel:** listado de jugadores ordenado por dorsal, con búsqueda por nombre (sin distinguir mayúsculas ni tildes), filtro por posición y paginación. En pantallas de menos de 640 px, la tabla se muestra como tarjetas.
- **Gestión de jugadores:** registrar, editar (incluido el estado activo/inactivo) y eliminar.
- **Perfil del jugador:** ficha deportiva, edad calculada y biografía.
- **Tema claro / oscuro / sistema.**
- **Página 404 personalizada.**

> Las secciones **Equipos** y **Partidos** todavía no están implementadas: aparecen en la navegación y en la portada con el aviso «Próximamente», sin enlace. Los datos (`equipos`, `partidos`, `goles`, `posiciones_por_grupo`) ya existen en la base de datos.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Lenguaje | TypeScript |
| UI | React 19, HeroUI v3, Tailwind CSS v4, lucide-react, sonner |
| Datos | Prisma ORM 7 (`@prisma/adapter-pg`), PostgreSQL 17 |
| Autenticación | Better Auth (correo y contraseña, sesiones en PostgreSQL) |
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

# 2. Variables de entorno: copia el ejemplo y completa DATABASE_URL, el secreto de
#    Better Auth y las credenciales de los usuarios (ver "Base de datos local" y
#    "Autenticación y roles" más abajo)
cp .env.example .env

# 3. Base de datos en Docker
pnpm db:up

# 4. Crear las tablas (y, si tienes prisma/seed-data.json, cargar los datos)
pnpm db:migrate
pnpm db:seed

# 5. Crear los usuarios administrador y demo (lee ADMIN_* y DEMO_* del .env)
pnpm db:usuarios

# 6. Servidor de desarrollo
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
| `pnpm test` | Todas las pruebas (unitarias, componentes e integración) |
| `pnpm test:unit` | Pruebas unitarias y de componentes (no necesitan base de datos) |
| `pnpm test:integration` | Pruebas de integración contra la base de pruebas |
| `pnpm test:watch` | Pruebas en modo observación |
| `pnpm db:up` / `pnpm db:down` | Levantar / detener PostgreSQL en Docker |
| `pnpm db:migrate` | Crear y aplicar migraciones (desarrollo) |
| `pnpm db:deploy` | Aplicar migraciones pendientes (producción) |
| `pnpm db:seed` | Cargar los datos iniciales |
| `pnpm db:usuarios` | Crear o actualizar los usuarios administrador y demo |
| `pnpm db:studio` | Explorar los datos con Prisma Studio |

`pnpm db:down` conserva los datos (volumen `pgdata`). Para borrarlos por completo: `docker compose down -v`.

### Base de datos local

`docker-compose.yml` no necesita variables de entorno ni guarda contraseñas en el repositorio:

- Usuario `football` y base de datos `football_players`.
- Al crear la base por primera vez se usa autenticación `trust` (sin contraseña). El puerto solo se publica en `127.0.0.1`, así que solo es accesible desde tu equipo.
- Si el volumen `pgdata` ya existía, Postgres conserva la configuración con la que se creó. Si ese volumen se creó con contraseña, sigue siendo necesaria en `DATABASE_URL`.

Con una base creada desde cero, `DATABASE_URL` queda así:

```env
DATABASE_URL="postgresql://football@localhost:5432/football_players?schema=public"
```

Solo para desarrollo: no uses autenticación `trust` en ningún entorno accesible desde la red.

## Autenticación y roles

La autenticación usa [Better Auth](https://www.better-auth.com) con correo y contraseña. Las sesiones se guardan en PostgreSQL (tablas `usuarios`, `sesiones`, `cuentas` y `verificaciones`).

| Rol | Puede | No puede |
|---|---|---|
| `admin` | Ver todo, registrar, editar y eliminar | — |
| `demo` | Ver todo | Registrar, editar o eliminar: el servidor rechaza la acción y la app muestra «El usuario demo no tiene permisos para modificar datos» |

- **Sin sesión no se ve ninguna página:** `src/proxy.ts` redirige cualquier ruta a `/login`.
- **El permiso se comprueba en el servidor**, al inicio de cada Server Action (`src/lib/sesion.ts`). Los botones siguen visibles para el usuario demo; quien decide es el servidor.
- **No hay registro público.** Los usuarios se crean con `pnpm db:usuarios`, que lee las credenciales del entorno:

  | Variable | Uso |
  |---|---|
  | `BETTER_AUTH_SECRET` | Firma las cookies de sesión. Obligatoria. |
  | `BETTER_AUTH_URL` | URL pública de la app. Opcional en Vercel. |
  | `DEMO_EMAIL`, `DEMO_PASSWORD` | Usuario demo. Las usan `pnpm db:usuarios` y el botón «Entrar como demo» (en el servidor). |
  | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Usuario administrador. Solo las usa `pnpm db:usuarios`. |

- `pnpm db:usuarios` es idempotente: si el usuario ya existe, actualiza su contraseña y su rol. Sirve también para **cambiar una contraseña**: edita el `.env` y vuelve a ejecutarlo.
- El inicio de sesión admite 5 intentos por minuto por IP y correo. El contador vive en la memoria del proceso, así que en un entorno serverless es una protección de «mejor esfuerzo».

## Pruebas

Las pruebas usan [Vitest](https://vitest.dev) y Testing Library, organizadas en tres proyectos:

| Proyecto | Carpeta | Entorno | Qué cubre |
|---|---|---|---|
| `unit` | `tests/unit/` | Node | Utilidades de fechas y edad, reglas de validación (zod) |
| `components` | `tests/components/` | jsdom | Tabla y paginación, filtros, formulario de jugador, modal de eliminación, inicio de sesión, mensaje de falta de permisos |
| `integration` | `tests/integration/` | Node + PostgreSQL | Server Actions y consultas contra una base de datos real; control de acceso por rol, inicio y cierre de sesión, redirección al login |

Las pruebas de integración crean usuarios `admin` y `demo` en la base de pruebas e inician sesiones reales de Better Auth; no usan `BETTER_AUTH_SECRET` ni las credenciales del `.env`.

### Base de datos de pruebas

Las pruebas de integración usan una base **separada**, definida en `TEST_DATABASE_URL` (ver `.env.example`):

- Se crea automáticamente en el Postgres de Docker si no existe, y se le aplican las migraciones.
- **Todas sus tablas se vacían antes de cada prueba.** Por seguridad, la URL debe apuntar a `localhost` y el nombre de la base debe terminar en `_test`; si no, las pruebas se detienen sin conectarse.
- Las pruebas nunca leen `DATABASE_URL` ni `DIRECT_URL`, así que no tocan tu base de desarrollo ni Neon.

```bash
pnpm db:up   # Postgres en Docker
pnpm test
```

Si `TEST_DATABASE_URL` no está definida, `pnpm test` ejecuta solo las pruebas unitarias y de componentes, y muestra un aviso.

### Integración continua

`.github/workflows/ci.yml` se ejecuta en cada pull request y en cada push a `main`: lint, todas las pruebas (con PostgreSQL 17 como servicio del runner), build y typecheck. No usa secretos ni se conecta a Neon.

## Despliegue con Neon

1. Crea un proyecto en Neon y copia sus dos cadenas de conexión.
2. Configura en el entorno de producción (por ejemplo, Vercel):
   - `DATABASE_URL`: conexión **con pooling** (host con `-pooler`), la que usa la app.
   - `DIRECT_URL`: conexión **directa** (host sin `-pooler`), la que usa la CLI de Prisma.
   - `BETTER_AUTH_SECRET`: un secreto propio de producción.
   - `DEMO_EMAIL` y `DEMO_PASSWORD`: para el botón «Entrar como demo».
   - `BETTER_AUTH_URL`: opcional en Vercel (si falta, se usa la URL del despliegue).
3. Aplica el esquema y, si quieres los datos iniciales, ejecuta el seed apuntando a Neon. Después crea los usuarios (con `ADMIN_*` y `DEMO_*` en el entorno):

   ```bash
   pnpm db:deploy
   pnpm db:seed
   pnpm db:usuarios
   ```

> **Orden importante:** aplica las migraciones (`pnpm db:deploy`) **antes** de desplegar una versión nueva del código. La aplicación consulta la tabla de sesiones en cada petición; sin ella, todas las páginas fallan.

`prisma.config.ts` usa `DIRECT_URL` para la CLI cuando existe y, si no, `DATABASE_URL`.

## Estructura

```text
prisma/
├── schema.prisma          # Modelos (mapeados a las tablas originales)
├── migrations/            # Migraciones (incluyen las restricciones CHECK)
├── seed.ts                # Seed idempotente
├── usuarios.ts            # Alta de los usuarios administrador y demo
└── seed-data.json         # Datos migrados desde Supabase (local, no versionado)
src/
├── proxy.ts               # Inicio de sesión obligatorio (redirige a /login)
├── app/
│   ├── layout.tsx         # Layout raíz, fuentes, tema, navegación
│   ├── login/             # Inicio de sesión (page) y sus Server Actions
│   ├── page.tsx           # Portada
│   ├── not-found.tsx      # 404
│   └── jugadores/
│       ├── (lista)/       # Listado (page, loading, error)
│       ├── [id]/          # Perfil del jugador
│       ├── actions.ts     # Server Actions: crear, editar, eliminar
│       └── data.ts        # Consultas (solo servidor)
├── components/            # Navbar, Footer, ThemeSwitcher, jugadores/*
├── lib/                   # Prisma, Better Auth, sesión y roles, dominio y validación
└── generated/prisma/      # Cliente de Prisma generado (no se versiona)
tests/
├── unit/                  # Lógica pura (Node)
├── components/            # Componentes de React (jsdom)
├── integration/           # Server Actions y consultas contra PostgreSQL
└── stubs/                 # Sustitutos de módulos solo de servidor
.github/workflows/ci.yml   # Integración continua
vitest.config.ts           # Configuración de las pruebas
```

## Seguridad

- La base de datos solo se accede desde el servidor (Server Components y Server Actions). El navegador no recibe credenciales.
- Inicio de sesión obligatorio: sin sesión, cualquier ruta redirige a `/login`. Las consultas de datos también exigen sesión por su cuenta.
- Cada Server Action comprueba la sesión y el rol antes de validar o escribir: solo `admin` puede modificar datos. La sesión se valida contra la base de datos en cada petición, así que cerrar sesión o cambiar un rol tiene efecto inmediato.
- Las contraseñas se guardan con hash (scrypt). Las cookies de sesión son `HttpOnly`, están firmadas y, con HTTPS, son `Secure`.
- Las credenciales demo solo existen en variables de entorno del servidor: no están en el repositorio, en el bundle del cliente ni en los logs.
- No se expone la API HTTP de Better Auth (`/api/auth/*`) ni existe registro público: el inicio y el cierre de sesión son Server Actions.
- Las restricciones `CHECK` de la base de datos (dorsal 1-99, fecha de nacimiento, rol) repiten las reglas de la aplicación.
- Nunca subas `.env` ni los backups de la base de datos al repositorio (ambos están en `.gitignore`).

## Contribuir

1. Crea una rama desde `main` (`feat/...`, `fix/...`).
2. Antes de abrir el PR: `pnpm lint`, `pnpm test`, `pnpm build` y `pnpm typecheck` (lo mismo que ejecuta la CI).
3. Usa commits semánticos (`feat: ...`, `fix: ...`).
