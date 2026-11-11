# Auditoría técnica de Football Players

| | Fecha | Stack |
|---|---|---|
| **Auditoría inicial** | 2026-11-10 | React 19 + Vite (SPA, JavaScript) + Supabase |
| **Actualización** | 2026-11-10, tras la migración (fase 0) | Next.js 16 (TypeScript) + Prisma 7 + PostgreSQL (Docker en desarrollo, Neon en producción) |

Este documento conserva la auditoría original como punto de partida y registra el **estado actual** de cada hallazgo después de la migración.

**Estados de un hallazgo:**

- ✅ **Resuelto**: corregido y verificado.
- 🟡 **Parcial**: mejorado, pero queda trabajo.
- 🔴 **Vigente**: sigue presente.
- ⚪ **Obsoleto**: el código afectado ya no existe.
- ➖ **Descartado**: la sospecha resultó falsa.

**Grado de certeza:** **Confirmado** = verificado en el código, en la librería o en el backup. **Sospecha** = no verificable en su momento.

---

## Alcance y método

### Auditoría inicial (solo lectura)

- Se leyó todo `src/`, la configuración, el README y el `.gitignore`.
- Se ejecutó `pnpm run lint`, `vite build` (salida fuera del repo) y `pnpm audit`.
- Se comprobó la API real de las librerías en `node_modules` y se calculó el contraste WCAG de la paleta.
- No había acceso por red a Supabase ni esquema en el repositorio: lo relativo a base de datos y RLS quedó como **sospecha**.

### Fuentes añadidas después

- **Backup de Supabase** (`db_cluster-29-10-2026@17-45-45.backup.gz`, PostgreSQL 17.11): esquema, políticas, permisos y datos de las 6 tablas de `public`. Confirmó o descartó las sospechas de base de datos.
- **Export de Storage**: archivo zip vacío. El backup confirma que no había buckets ni objetos.
- **Verificación tras la migración:** `tsc`, ESLint y `next build` sin errores; 12 pruebas de extremo a extremo de las Server Actions contra `next start`; comprobación de los códigos HTTP de todas las rutas; `pnpm audit`.

---

## A. Resumen ejecutivo

### Estado inicial

CRUD de jugadores funcional con una identidad visual cuidada, en fase de prototipo. Sin autenticación, con todas las escrituras hechas desde el navegador con la clave pública de Supabase y **sin RLS en ninguna tabla** (confirmado por el backup). Tres bugs funcionales, navegación hacia páginas inexistentes, formularios duplicados y ninguna prueba.

### Estado actual

La migración a Next.js + Prisma eliminó el riesgo más grave del diseño anterior: **la base de datos ya solo se accede desde el servidor** y el navegador no recibe credenciales. El esquema está versionado en el repositorio, los datos se cargan con un seed reproducible y se resolvieron 19 de los 30 hallazgos originales (y 3 más de forma parcial).

### Fortalezas (se mantienen)

- Identidad visual sólida y coherente, con tokens `--pl-*` para modo claro y oscuro.
- Estados de carga, error y vacío con reintento.
- Fechas formateadas sin desfase por zona horaria.
- `.env` ignorado y nunca commiteado.
- Respeto de `prefers-reduced-motion`.

### Fortalezas nuevas

- Acceso a datos solo en el servidor (Server Components y Server Actions).
- Validación con zod en el servidor, que no depende del formulario.
- Esquema versionado con migraciones, incluidas las restricciones `CHECK` originales.
- TypeScript estricto en todo el código.
- Errores de base de datos traducidos a mensajes claros (registro inexistente, jugador con goles).

### Debilidades vigentes

- **No hay autenticación:** las Server Actions son endpoints públicos.
- No hay pruebas en un navegador real ni medición de cobertura (las unitarias, de componentes y de integración ya existen; fase 2).
- Las secciones Equipos y Partidos siguen sin existir.
- El modelo de datos tiene inconsistencias heredadas (H-31 a H-35).

### Riesgos principales

1. Cualquier visitante puede crear, editar o eliminar jugadores llamando a las Server Actions (H-17).
2. Jugadores sin equipo y goles registrados dos veces impedirán construir estadísticas fiables (H-31, H-32).

---

## B. Evaluación por categorías

| Categoría | Inicial | Actual | Justificación del cambio |
|---|---|---|---|
| Arquitectura | 6 | 8 | Separación clara: consultas en `data.ts` (solo servidor), mutaciones en `actions.ts`, presentación en componentes. |
| Calidad del código | 6 | 8 | TypeScript estricto, lint y typecheck limpios, sin código muerto ni duplicado conocido. |
| Funcionalidad | 5 | 6 | Bugs del CRUD corregidos; Equipos y Partidos siguen sin existir. |
| Base de datos | 4 | 6 | Esquema y migraciones en el repo, seed reproducible. Persisten los problemas del modelo (H-31 a H-35) y los dorsales repetidos. |
| Seguridad | 3 | 5 | Sin credenciales en el navegador, validación en el servidor y proyecto de Supabase desactivado. Falta la autenticación. |
| UI/UX | 7 | 7 | Mismo diseño, revisado en el navegador por el propietario tras la migración; terminología y etiquetas corregidas. Tabla en móvil y secciones vacías sin resolver. |
| Rendimiento | 7 | 7 | Código dividido por ruta y fuentes alojadas localmente; el CSS de HeroUI sigue completo. |
| Accesibilidad | 5 | 6 | `lang="es"`, un solo `<main>`, `<nav>` en la paginación. El contraste en modo oscuro sigue sin corregir. |
| Testing | 1 | 7 | 101 pruebas (unitarias, de componentes y de integración contra PostgreSQL) con `pnpm test` y CI. Faltan pruebas en navegador y medición de cobertura. |
| Mantenibilidad | 5 | 8 | Formulario único, utilidades centralizadas, README fiel al código. |

---

## C. Hallazgos técnicos

### Bugs funcionales

#### H-01 · Clases rotas en el filtro de posiciones · ✅ Resuelto
- **Categoría:** UI · **Certeza:** Confirmado · **Severidad:** media
- **Ubicación original:** `src/pages/PlayersPage.jsx:257-258`
- **Problema:** sobraba un `]` en `bg-(--pl-ink)]` y `border-(--pl-line)]`, así que Tailwind no generaba esas clases y el filtro activo apenas se distinguía.
- **Estado actual:** clases corregidas en `src/components/jugadores/PlayersView.tsx`.

#### H-02 · `toast.danger` no existe en sonner · ✅ Resuelto
- **Categoría:** Funcional · **Certeza:** Confirmado · **Severidad:** alta
- **Ubicación original:** `src/components/DeletePlayerModal.jsx:37`
- **Problema:** al fallar una eliminación, el `catch` lanzaba un `TypeError` y no se mostraba la notificación.
- **Estado actual:** `toast.error` en `src/components/jugadores/DeletePlayerModal.tsx`, con el motivo del error del servidor.

#### H-03 · La paginación se desincronizaba al filtrar · ✅ Resuelto
- **Categoría:** Funcional · **Certeza:** Confirmado · **Severidad:** media
- **Ubicación original:** `src/components/PlayersTable.jsx:137`, `:150`
- **Problema:** «Anterior» partía del estado sin recortar; tras filtrar hacían falta varios clics.
- **Estado actual:** `src/components/jugadores/PlayersTable.tsx` parte de `paginaActual`, y la tabla se reinicia al cambiar de filtro.

#### H-04 · Cancelar una edición conservaba los cambios · ✅ Resuelto
- **Categoría:** Funcional · **Certeza:** Confirmado · **Severidad:** media
- **Ubicación original:** `src/components/EditPlayerModal.jsx:25-31`
- **Estado actual:** `PlayerFormModal` se monta de nuevo en cada apertura (`key`), así que cancelar descarta los cambios.

#### H-05 · El formulario de edición permitía doble envío · ✅ Resuelto
- **Categoría:** Funcional · **Certeza:** Confirmado · **Severidad:** baja-media
- **Estado actual:** crear y editar usan `useTransition`; el botón queda en estado pendiente y el modal no se puede cerrar mientras guarda.

#### H-06 · Fechas de nacimiento futuras o absurdas · 🟡 Parcial
- **Categoría:** Validación · **Certeza:** Confirmado · **Severidad:** media
- **Estado actual:** rechazadas en el cliente (`min`/`max` y `validate`) y en el servidor (`src/lib/validacion.ts`), verificado con prueba de extremo a extremo.
- **Pendiente:** un `CHECK` en la base de datos, para que tampoco puedan entrar por otras vías.

#### H-07 · Dorsales duplicados · 🔴 Vigente
- **Categoría:** Datos · **Certeza:** Confirmado (backup) · **Severidad:** media
- **Evidencia:** no existe `UNIQUE(dorsal)` y los datos ya tienen repetidos: el 10 aparece en 5 jugadores y el 7 en 2.
- **Solución:** decidir la regla de negocio. ¿El dorsal debe ser único globalmente o por equipo? Depende de H-31. Después, limpiar los duplicados, añadir la restricción y mostrar un mensaje específico (código `P2002`).

#### H-08 · Navegación a secciones que no existen · 🔴 Vigente
- **Categoría:** Funcional / UX · **Certeza:** Confirmado · **Severidad:** media
- **Ubicación actual:** `src/components/Navbar.tsx` (navegación) y `src/app/page.tsx` (tarjetas de la portada).
- **Evidencia:** `/equipos` y `/partidos` devuelven 404.
- **Solución:** implementarlas (fase 6) o marcarlas como «Próximamente».

#### H-09 · Terminología de estado inconsistente · ✅ Resuelto
- **Categoría:** UX · **Certeza:** Confirmado · **Severidad:** baja
- **Estado actual:** un único término, «Activo» o «Inactivo» (`etiquetaEstado` en `src/lib/jugadores.ts`).

#### H-10 · Caja vacía si la foto fallaba · ✅ Resuelto
- **Categoría:** UI · **Certeza:** Confirmado · **Severidad:** baja
- **Estado actual:** `src/components/jugadores/PlayerPhoto.tsx` muestra las iniciales si la imagen falla.

#### H-11 · Estado de error sin usar en el modal de creación · ⚪ Obsoleto
- El componente se eliminó al unificar los formularios (H-27).

### Datos y base de datos

#### H-12 · Modelo de datos no versionado · ✅ Resuelto
- **Categoría:** Base de datos · **Certeza:** Confirmado · **Severidad:** alta
- **Estado actual:**
  - `prisma/schema.prisma` reproduce las 6 tablas originales.
  - `prisma/migrations/` contiene la migración inicial con las 3 restricciones `CHECK`.
  - `prisma/seed.ts` y `prisma/seed-data.json` cargan los datos del backup de forma idempotente.

#### H-13 · Columna de fecha con nombre ambiguo · ✅ Resuelto
- **Categoría:** Datos / Mantenibilidad · **Certeza:** Confirmado · **Severidad:** media
- **Estado actual:** una sola columna, `fecha_nacimiento`, mapeada al campo `fechaNacimiento` de Prisma.

#### H-14 · Lista cargada sin orden ni columnas concretas · ✅ Resuelto
- **Categoría:** Base de datos · **Certeza:** Confirmado · **Severidad:** baja
- **Estado actual:** `src/app/jugadores/data.ts` selecciona columnas concretas y ordena en la base de datos por dorsal e id.
- **Nota:** no hay límite de filas. Con el volumen actual no es necesario.

#### H-15 · `activo` no se enviaba al crear · ➖ Descartado
- El backup muestra `activo boolean DEFAULT true`. Aun así, la acción de crear lo envía explícitamente.

#### H-16 · Concurrencia «el último en guardar gana» · 🔴 Vigente (aceptable)
- **Categoría:** Datos · **Certeza:** Confirmado · **Severidad:** baja
- Aceptable para un solo administrador. No se recomienda actuar ahora.

### Seguridad

#### H-17 · Escrituras sin autenticación · 🟡 Parcial
- **Categoría:** Seguridad · **Certeza:** Confirmado · **Severidad:** crítica antes; alta ahora
- **Evidencia original (backup):** ninguna tabla de `public` tenía RLS y el rol `anon` tenía `GRANT ALL` sobre todas las tablas y secuencias. Cualquiera con la clave pública, que viajaba en el bundle, podía leer, modificar o borrar todo.
- **Estado actual:**
  - ✅ La base de datos ya no es accesible desde el navegador; la cadena de conexión solo existe en el servidor.
  - ✅ Toda escritura pasa por validación en el servidor y por comprobación de id.
  - 🔴 Las Server Actions (`src/app/jugadores/actions.ts`) son endpoints HTTP públicos sin autenticación: cualquier visitante puede crear, editar o eliminar jugadores.
  - ✅ El proyecto de Supabase está desactivado (confirmado por el propietario, 2026-11-11): la clave pública antigua ya no da acceso a los datos.
- **Solución pendiente:** añadir autenticación (por ejemplo, Auth.js o Better Auth) y comprobar la sesión al inicio de cada Server Action.

#### H-18 · Variables de entorno mal documentadas · ✅ Resuelto
- **Categoría:** Configuración · **Certeza:** Confirmado · **Severidad:** baja
- **Estado actual:**
  - `.env.example` documenta `DATABASE_URL` y `DIRECT_URL`.
  - El README explica el desarrollo con Docker y el despliegue con Neon.
  - `src/lib/prisma.ts` muestra un error claro si falta `DATABASE_URL`.

#### H-19 · Vulnerabilidad en una dependencia de desarrollo · 🔴 Vigente (baja)
- **Categoría:** Dependencias · **Certeza:** Confirmado · **Severidad:** baja
- **Evidencia:** `pnpm audit` sigue reportando 1 vulnerabilidad moderada en `minimatch`, que ahora llega a través de `eslint-config-next` → `typescript-eslint`.
- **Impacto:** solo afecta a herramientas de desarrollo; no llega a producción.

**XSS:** sin riesgo detectado. No hay `dangerouslySetInnerHTML`, React escapa el texto y `fotoUrl` solo se usa en `<img src>`.

### Accesibilidad y UI

#### H-20 · `<main>` anidados · ✅ Resuelto
- **Estado actual:** un único `<main id="contenido">` en `src/app/layout.tsx`; las páginas usan `<div>` y `<section>`.

#### H-21 · `lang` y título del documento · ✅ Resuelto
- **Estado actual:** `lang="es"` y títulos por página («Jugadores · Football Players», nombre del jugador en su perfil).

#### H-22 · Contraste insuficiente · 🔴 Vigente
- **Categoría:** Accesibilidad · **Certeza:** Confirmado (cálculo WCAG) · **Severidad:** media
- **Ubicación:** tokens en `src/app/plantel.css`, sin cambios.

| Combinación | Ratio | Mínimo AA |
|---|---|---|
| Rojo sobre fondo oscuro (`#e8353d` / `#0f2e21`) | 3,49 | 4,5 |
| Blanco sobre rojo oscuro (`#e8353d`) | 4,19 | 4,5 |
| Rojo sobre fondo claro (kickers de 0,7 rem) | 4,45 | 4,5 |
| `text-white/80` sobre la banda roja | ≈3,7 | 4,5 |

- **Solución:** un token `--pl-sash-text` más claro solo para texto en modo oscuro. No cambia la identidad visual.

#### H-23 · Paginación con `aria-label` sin rol · ✅ Resuelto
- **Estado actual:** la paginación es un `<nav aria-label>`.

#### H-24 · Pie de página con recarga completa · ✅ Resuelto
- **Estado actual:** `src/components/Footer.tsx` usa `<Link>` de Next.js.

#### H-25 · Etiquetas engañosas · ✅ Resuelto
- **Estado actual:** «RANKING» pasó a «PLANTEL», se retiró «Mundial 2026» y queda un solo contador.

#### H-26 · Tabla de 850 px de ancho mínimo en móvil · 🔴 Vigente
- **Categoría:** UI / Responsive · **Certeza:** Confirmado · **Severidad:** baja-media
- **Ubicación:** `src/app/plantel.css` (`.pl-table [role="grid"]`).
- **Solución:** vista de tarjetas en pantallas pequeñas.

### Deuda técnica

#### H-27 · Formularios de creación y edición duplicados · ✅ Resuelto
- **Estado actual:** un único `src/components/jugadores/PlayerFormModal.tsx` y la constante `POSICIONES` en `src/lib/jugadores.ts`.

#### H-28 · Utilidades de fecha duplicadas · ✅ Resuelto
- **Estado actual:** `formatearFecha`, `calcularEdad` y `fechaAISO` centralizadas en `src/lib/jugadores.ts`.

#### H-29 · Dependencias y archivos sin uso · ✅ Resuelto
- **Estado actual:** se eliminaron `react-icons` (solo queda `lucide-react`) y los recursos sin uso de `src/assets/`.

#### H-30 · Bundle en un solo bloque · 🟡 Parcial
- **Categoría:** Rendimiento · **Certeza:** Confirmado · **Severidad:** baja
- **Antes:** un solo bloque de JS de 1 MB (298 KB comprimido).
- **Ahora:** Next.js divide el código por ruta; el bloque más grande pesa 78 KB comprimido. Las fuentes se alojan localmente con `next/font`.
- **Pendiente:** el CSS global sigue en 441 KB (42 KB comprimido) porque `@heroui/styles` se importa completo.

### Hallazgos nuevos del backup (modelo de datos)

#### H-31 · Los jugadores no pertenecen a ningún equipo · 🔴 Vigente
- **Categoría:** Base de datos · **Certeza:** Confirmado · **Severidad:** alta (bloquea funcionalidades)
- **Evidencia:** `jugadores` no tiene `equipo_id`. `goles` se relaciona con `jugadores` y `partidos`, pero no se puede saber para qué selección marcó cada jugador.
- **Impacto:** no se pueden construir plantillas por equipo, goleadores por selección ni validar que un gol sea de un jugador de uno de los dos equipos.
- **Solución:** añadir `equipo_id` (FK a `equipos`) a `jugadores` y asignar los 12 jugadores existentes.

#### H-32 · Goles registrados dos veces · 🔴 Vigente
- **Categoría:** Integridad · **Certeza:** Confirmado · **Severidad:** media
- **Evidencia:** `partidos.goles_local` y `partidos.goles_visitante` guardan el marcador, y la tabla `goles` guarda cada gol. Nada garantiza que coincidan.
- **Solución:** calcular el marcador a partir de `goles` (vista o consulta) o validar la coincidencia al registrar.

#### H-33 · Tabla de posiciones guardada en lugar de calculada · 🔴 Vigente
- **Categoría:** Integridad · **Certeza:** Confirmado · **Severidad:** media
- **Evidencia:** `posiciones_por_grupo` guarda PJ, PG, PE, PP, GF, GC y puntos a mano, que pueden contradecir a `partidos`.
- **Solución:** sustituirla por una vista SQL calculada desde `partidos`.

#### H-34 · Tipos de columna inconsistentes · 🔴 Vigente
- **Categoría:** Base de datos · **Certeza:** Confirmado · **Severidad:** baja
- **Evidencia:**
  - El grupo es `char(1)` en `equipos` y `char(2)` en `posiciones_por_grupo` (los valores quedan como `"A "`).
  - `equipos.fecha_creacion` y `partidos.fecha` son `timestamp` sin zona horaria.
- **Solución:** unificar el grupo en `char(1)` y usar `timestamptz`, con una migración que convierta los valores.

#### H-35 · No hay índices en las claves foráneas · 🔴 Vigente (prematuro)
- **Categoría:** Rendimiento de base de datos · **Certeza:** Confirmado · **Severidad:** baja
- **Evidencia:** PostgreSQL no crea índices automáticamente en las columnas FK (`goles.jugador_id`, `goles.partido_id`, `partidos.local_id`, etc.).
- **Impacto:** nulo con decenas de filas. Conviene añadirlos al implementar estadísticas (fase 6).

### Resumen de estados

| Estado | Hallazgos |
|---|---|
| ✅ Resuelto (19) | H-01, H-02, H-03, H-04, H-05, H-09, H-10, H-12, H-13, H-14, H-18, H-20, H-21, H-23, H-24, H-25, H-27, H-28, H-29 |
| 🟡 Parcial (3) | H-06, H-17, H-30 |
| 🔴 Vigente (11) | H-07, H-08, H-16, H-19, H-22, H-26, H-31, H-32, H-33, H-34, H-35 |
| ⚪ Obsoleto (1) | H-11 |
| ➖ Descartado (1) | H-15 |

---

## D. Mejoras recomendadas (estado actual)

### 1. Críticas
- ~~Desactivar o eliminar el proyecto de Supabase (H-17).~~ ✅ Hecho.
- Autenticación en las Server Actions (H-17).

### 2. Importantes
- Relacionar jugadores con equipos (H-31).
- Decidir la regla del dorsal y aplicarla (H-07).
- ~~Llevar las pruebas de extremo a extremo al repositorio y añadir pruebas unitarias.~~ ✅ Hecho en la fase 2.
- `CHECK` de fecha de nacimiento en la base de datos (H-06).

### 3. Experiencia y accesibilidad
- Contraste en modo oscuro (H-22).
- Tabla en móvil (H-26).
- Secciones Equipos y Partidos o aviso «Próximamente» (H-08).
- Búsqueda por nombre.

### 4. Rendimiento
- Nada urgente. Revisar el CSS completo de HeroUI (H-30) e índices de FK al llegar a las estadísticas (H-35).

### 5. Nuevas funcionalidades

| Funcionalidad | Problema / valor | Datos | Cambios técnicos | Dificultad | Prioridad |
|---|---|---|---|---|---|
| Búsqueda por nombre | Encontrar un jugador sin paginar | `jugadores` | Input y filtro en cliente | Baja | **Alta** |
| Módulo Equipos | La navegación ya lo promete | `equipos` + `equipo_id` (H-31) | Rutas, lista y detalle; plantilla por equipo | Media | **Alta** |
| Partidos y resultados | La navegación ya lo promete | `partidos`, `equipos` | Rutas y lista por fase; marcador desde `goles` (H-32) | Media | Alta |
| Goleadores | Valor inmediato con datos existentes | `goles` → `jugadores` | Consulta agregada con Prisma (`groupBy`) | Media | Media |
| Tabla de posiciones | Seguir el torneo | `partidos` | Vista SQL en lugar de la tabla manual (H-33) | Media | Media |
| Estadísticas en el perfil | Enriquecer el perfil | `goles`, `partidos` | Sección nueva en `src/app/jugadores/[id]/page.tsx` | Media | Media |
| Exportar a CSV | Sacar los datos de la app | `jugadores` | Route Handler que devuelva CSV | Baja | Baja |

### 6. Mejoras futuras (fuera del alcance actual)
- Comparador de jugadores, convocatorias, gestión de torneos y gráficas avanzadas.
- Control de concurrencia optimista (H-16).
- Virtualizar la tabla o paginar en el servidor.

---

## E. Roadmap de implementación

### Fase 0 · Migración de React (Vite) + Supabase a Next.js + Prisma — ✅ Completada (2026-11-10)
- **Objetivo:** abandonar Supabase y pasar de una SPA de React con Vite a una aplicación full-stack con Next.js, conservando la funcionalidad y la identidad visual.
- **Cambio de stack:**

  | Antes | Después |
  |---|---|
  | React 19 + Vite (SPA, JavaScript) | Next.js 16 con App Router (TypeScript) |
  | `@supabase/supabase-js` llamado desde el navegador | Prisma ORM 7 (`@prisma/adapter-pg`), solo en el servidor |
  | Escrituras directas desde el cliente con la clave pública | Server Actions con validación zod en el servidor |
  | React Router | Enrutamiento por archivos de Next.js |
  | Base de datos en Supabase | PostgreSQL 17 en Docker (desarrollo) y Neon (producción) |

- **Lo que confirmó el backup de Supabase (29-10-2026):**
  - Ninguna tabla de `public` tenía RLS y el rol `anon` tenía `GRANT ALL`: el riesgo H-17 era real y crítico.
  - Ya hay dorsales repetidos (7 y 10) y no existe `UNIQUE(dorsal)` (H-07).
  - `activo` tiene `DEFAULT true` (H-15 descartado).
  - Storage estaba vacío: no había buckets ni archivos, y todas las `foto_url` eran nulas.
  - Aparecieron los problemas de modelo H-31 a H-35.
- **Tareas realizadas:**
  - Esquema de Prisma fiel a las 6 tablas originales (columnas, tipos, valores por defecto, claves foráneas) y migración inicial con las 3 restricciones `CHECK`.
  - Seed idempotente con los datos del backup (`prisma/seed-data.json`): conserva los id y ajusta las secuencias.
  - `docker-compose.yml` con PostgreSQL 17 para desarrollo.
  - Reescritura de todas las páginas y componentes en TypeScript, corrigiendo de paso H-01, H-02, H-03, H-04, H-05, H-06 (parcial), H-09, H-10, H-13, H-14, H-18, H-20, H-21, H-23, H-24, H-25, H-27, H-28 y H-29.
  - README actualizado con instalación, scripts y despliegue en Neon.
- **Archivos:** `prisma/`, `prisma.config.ts`, `docker-compose.yml`, `src/app/`, `src/components/`, `src/lib/`, configuración de Next.js, TypeScript, ESLint y PostCSS. Se eliminaron los archivos de Vite y Supabase.
- **Verificación:** `tsc`, ESLint y `next build` sin errores; 12 pruebas de extremo a extremo de las Server Actions (validación, crear, editar, eliminar, id inválidos); las rutas inexistentes devuelven 404.
- **Cierre (2026-11-11, confirmado por el propietario):**
  - ✅ Interfaz revisada en el navegador (modales, cambio de tema, aspecto visual).
  - ✅ Proyecto de Supabase desactivado.
  - ✅ Esquema migrado a Neon y variables de entorno configuradas en Vercel (`DATABASE_URL` con pooling y `DIRECT_URL` directa).
  - ✅ Aplicación desplegada en Vercel con la base de datos de Neon.

### Fase 1 · Bugs confirmados — ✅ Completada dentro de la fase 0
- Todos los hallazgos previstos para esta fase se corrigieron al reescribir la aplicación, salvo H-08 (pasa a la fase 5 o a la 6).

### Fase 2 · Base de pruebas — ✅ Completada (2026-11-11)
- **Objetivo:** Vitest + Testing Library, más las pruebas de extremo a extremo ya escritas, integradas como `pnpm test`.
- **Herramientas:** Vitest 5 (tres proyectos), Testing Library (`react`, `user-event`, `jest-dom`), jsdom y `pg` para preparar la base de pruebas.
- **Pruebas (101 en total):**

  | Proyecto | Archivos | Pruebas | Qué cubre |
  |---|---|---|---|
  | `unit` | `tests/unit/` | 55 | `formatearFecha` en varias zonas horarias, `calcularEdad` (cumpleaños, 29 de febrero, fechas futuras), `fechaAISO`, `hoyISO`, `iniciales`; todas las reglas de `jugadorSchema` y sus límites |
  | `components` | `tests/components/` | 21 | Paginación de `PlayersTable`, filtros de `PlayersView`, estado vacío, `PlayerFormModal` (creación, edición, validación en el cliente, errores del servidor), `DeletePlayerModal` |
  | `integration` | `tests/integration/` | 25 | Las tres Server Actions y las consultas de `data.ts` contra PostgreSQL: validación, alta, edición, borrado en cascada, jugador con goles, id inválidos, orden del listado, restricciones `CHECK` |

- **Pruebas de regresión** de los bugs de la auditoría: H-01 (clase del filtro activo), H-02 (notificación de error al eliminar), H-03 (paginación al reducirse la lista y al cambiar de filtro) y H-04 (cancelar una edición). Se comprobó que la prueba de H-03 falla al reintroducir el bug original.
- **Base de datos de pruebas:** `TEST_DATABASE_URL`, separada de la de desarrollo. Se crea y migra sola, y se vacía antes de cada prueba. Una protección impide usarla si no apunta a `localhost` o si el nombre no termina en `_test`. Las pruebas nunca leen `DATABASE_URL` ni `DIRECT_URL`.
- **CI:** `.github/workflows/ci.yml` ejecuta lint, pruebas (PostgreSQL 17 como servicio, sin contraseña ni secretos), build y typecheck en cada PR y en cada push a `main`. En CI, la falta de `TEST_DATABASE_URL` es un error, no una omisión silenciosa.
- **Bug encontrado por las pruebas:** con una fecha vacía o mal formada, zod devolvía dos errores (formato y rango). Corregido en `src/lib/validacion.ts`: el rango solo se comprueba si el formato es válido.
- **Criterio de aceptación:** ✅ `pnpm test` en verde en local y en CI. El workflow pasó en su primera ejecución en GitHub (PR #3, 1 min 6 s), junto con el despliegue de vista previa en Vercel.
- **Fuera de alcance:** pruebas en un navegador real (Playwright), medición de cobertura y pruebas automáticas de accesibilidad.

### Fase 3 · Seguridad e integridad — Prioridad crítica
- **Tareas:**
  - ~~Desactivar o eliminar el proyecto de Supabase.~~ ✅ Hecho (2026-11-11).
  - Autenticación (por ejemplo, Auth.js o Better Auth) con comprobación de sesión al inicio de cada Server Action.
  - `CHECK` de fecha de nacimiento y de dorsal (1-99) en la base de datos.
  - Regla del dorsal (H-07): limpiar duplicados, añadir la restricción y mostrar el mensaje del error `P2002`.
- **Archivos:** `src/app/jugadores/actions.ts`, `prisma/schema.prisma`, nueva migración, layout para el inicio y cierre de sesión.
- **Dependencias:** la regla del dorsal depende de H-31 (¿único por equipo?).
- **Riesgo:** medio. La restricción `UNIQUE` falla si quedan duplicados.
- **Criterio de aceptación:** un visitante sin sesión no puede escribir; una petición directa a una Server Action sin sesión se rechaza.

### Fase 4 · Refactor — ✅ Completada dentro de la fase 0
- H-27, H-28 y H-29 se resolvieron en la migración.

### Fase 5 · UX y accesibilidad — Prioridad media
- **Tareas:**
  - Contraste (H-22).
  - Vista de tarjetas en móvil (H-26).
  - Búsqueda por nombre.
  - «Próximamente» en las secciones pendientes, si no se implementan antes (H-08).
- **Criterios de aceptación:** Lighthouse Accessibility ≥ 95 y navegación completa con teclado.

### Fase 6 · Modelo de datos, Equipos, Partidos y estadísticas — Prioridad media
- **Tareas:**
  - `equipo_id` en `jugadores` (H-31).
  - Marcador calculado desde `goles` (H-32) y posiciones como vista SQL (H-33).
  - Unificar tipos de columna (H-34) e índices en las FK (H-35).
  - Rutas `/equipos` y `/partidos`, goleadores y estadísticas en el perfil.
- **Dependencias:** fase 3.
- **Riesgos:**
  - Las migraciones de datos (asignar equipos, convertir tipos) deben probarse antes en Docker con el seed.
  - Hay que aplicarlas en Neon con `pnpm db:deploy` en el orden correcto.

---

## F. Evaluación final (estado actual)

**1. ¿Qué tan cerca está de un producto profesional?**
Aproximadamente al 65 % (40 % al inicio, 60 % tras la migración). La arquitectura, la calidad del código, la mantenibilidad y la base de pruebas ya están a nivel profesional. Faltan la autenticación y un modelo de datos coherente para crecer.

**2. Los cinco problemas más importantes**
1. Server Actions públicas sin autenticación (H-17).
2. Jugadores sin equipo (H-31).
3. Goles y posiciones guardados dos veces, sin garantía de coherencia (H-32, H-33).
4. Dorsales repetidos sin una regla de negocio definida (H-07).
5. Contraste insuficiente en modo oscuro (H-22).

**3. Las cinco mejoras de mayor impacto**
1. Añadir autenticación a las Server Actions.
2. Añadir `equipo_id` a `jugadores`.
3. Definir la regla del dorsal y aplicarla en la base de datos (H-07).
4. Implementar Equipos y Partidos sobre el modelo corregido.
5. Corregir el contraste en modo oscuro y la tabla en móvil (H-22, H-26).

**4. Qué no debería modificarse**
- La identidad visual (banda, dorsal con contorno, tipografías, tokens `--pl-*`).
- El acceso a datos solo en el servidor y la validación de las Server Actions.
- El seed idempotente y las migraciones versionadas.
- La estructura `app/`, `components/`, `lib/`.
- HeroUI y sonner.

**5. Qué funcionalidades implementar primero**
1. Búsqueda por nombre.
2. Módulo Equipos (tras H-31).
3. Partidos.
4. Goleadores.

**6. Qué mejoras serían innecesarias ahora**
- Estado global (Redux, Zustand) o React Query: los Server Components ya resuelven la carga de datos.
- Virtualizar la tabla o paginar en el servidor.
- Control de concurrencia optimista.
- Microfrontends o capas de arquitectura adicionales.
