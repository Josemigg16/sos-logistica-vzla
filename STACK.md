# Stack — SOS Logística

Monorepo para gestión logística en contextos de desastre natural. La prioridad es **velocidad de desarrollo** — convenciones simples, sin over-engineering.

---

## Estructura

```
sos-logistica/
├── apps/
│   ├── api/        # Backend Hono + Drizzle
│   └── web/        # Frontend React + Vite
├── packages/
│   └── shared/     # Tipos y schemas compartidos (Zod)
└── package.json    # Workspace root
```

---

## Backend — `apps/api`

| Capa | Tecnología |
|------|-----------|
| Runtime | [Bun](https://bun.sh/) |
| Framework HTTP | [Hono](https://hono.dev/) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Base de datos | PostgreSQL |
| Validación | Zod (schemas compartidos con frontend) |

**Por qué este stack:**
- Hono arranca en milisegundos, API mínima sin boilerplate
- Drizzle es SQL tipado — el schema ES la fuente de verdad, no un ORM mágico
- Schemas Zod en `packages/shared` garantizan que frontend y backend hablen el mismo idioma sin duplicar código

---

## Frontend — `apps/web`

| Capa | Tecnología |
|------|-----------|
| Bundler | [Vite](https://vitejs.dev/) |
| Framework UI | [React 19](https://react.dev/) |
| Router + Data | [TanStack Router v1](https://tanstack.com/router) (file-based, type-safe) + [TanStack Query v5](https://tanstack.com/query) |
| Componentes | [shadcn/ui](https://ui.shadcn.com/) |
| Estilos | [Tailwind CSS v4](https://tailwindcss.com/) |
| Estado global | TanStack Query (server state) + Zustand si hace falta client state |

**100% client-side** — no SSR, no server components. Desplegable como SPA estática.

**Rutas actuales:**

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `NecesidadesPage` | Panel público de necesidades humanitarias (página principal) |
| `/map` | `App` | Mapa interactivo de centros de acopio |

El plugin `@tanstack/router-plugin` genera `src/routeTree.gen.ts` automáticamente al levantar Vite — **no editar ese archivo a mano**.

**Por qué este stack:**
- Vite + HMR = feedback loop de segundos
- TanStack Router: type-safe, file-based, sin magia — `routeTree.gen.ts` se genera solo
- TanStack Query: cache de server state con `staleTime`, `placeholderData` para UX sin skeleton en primera carga
- shadcn no es una librería — son componentes que vivén en tu código, podés modificarlos sin límites
- Tailwind: velocidad de prototipado sin escribir CSS custom

---

## Packages compartidos — `packages/shared`

- **Zod schemas**: validación de request/response compartida
- **Tipos TypeScript**: inferidos desde los schemas (`z.infer<>`)
- **Constantes de dominio**: estados, categorías, prioridades de incidentes

---

## Arquitectura

Este proyecto aplica **Clean Architecture** + **Domain-Driven Design**. Las reglas completas están en las skills cargadas — acá están las decisiones aplicadas a este dominio.

### Skills de referencia

| Skill | Ubicación | Qué cubre |
|-------|-----------|-----------|
| Clean Architecture | `~/.claude/skills/clean-architecture/` | Capas, dependencias, boundaries, testing |
| Domain-Driven Design | `.claude/skills/domain-driven-design/` | Ubiquitous language, aggregates, bounded contexts, eventos |

### Capas (backend)

```
apps/api/src/
├── domain/          # Entidades, value objects, reglas de negocio — cero dependencias externas
│   ├── incidente/
│   ├── recurso/
│   └── operacion/
├── application/     # Use cases — orquesta dominio, no implementa reglas
├── infrastructure/  # Drizzle, Hono handlers, adapters externos
└── shared/          # Tipos compartidos con packages/shared
```

La regla crítica: **las dependencias apuntan hacia adentro siempre**. `domain/` no conoce Drizzle, Hono, ni Zod. Ver [`dep-inward-only`](~/.claude/skills/clean-architecture/references/dep-inward-only.md).

### Lenguaje ubicuo — términos del dominio

El código usa los términos que usaría un coordinador de emergencias, no términos técnicos.

| Término en código | Qué representa |
|------------------|----------------|
| `Incidente` | Evento de desastre natural activo |
| `Recurso` | Bien o personal disponible para asignación |
| `Operacion` | Misión de respuesta activa |
| `Asignacion` | Vínculo entre recurso y operación |
| `Prioridad` | Urgencia de un incidente (CRITICA / ALTA / MEDIA) |

Si aparece `DataManager`, `RequestHandler`, `ProcessorService` en el código → es una violación. Ver DDD: ubiquitous language.

### Bounded Contexts

Por ahora el sistema es un monolito modular. Los módulos son los boundaries:

| Módulo | Responsabilidad |
|--------|----------------|
| `incidentes` | Registro y ciclo de vida de desastres |
| `recursos` | Inventario y disponibilidad de recursos |
| `operaciones` | Coordinación de respuesta activa |
| `reportes` | Lectura optimizada (CQRS light — queries directas a BD) |

Un módulo no importa entidades de otro — se comunica por IDs o eventos de dominio. Ver DDD: bounded contexts + [`dep-acyclic-dependencies`](~/.claude/skills/clean-architecture/references/dep-acyclic-dependencies.md).

### Aggregates

- `Incidente` es aggregate root — `Afectado` y `Ubicacion` existen solo a través de él
- `Operacion` es aggregate root — `Asignacion` vive dentro de ella
- `Recurso` es aggregate root independiente — referenciado por ID desde `Operacion`

Mantener aggregates pequeños. Si una query necesita datos de dos aggregates, usar una query de lectura directa (no navegar el grafo de objetos). Ver DDD: building blocks.

### Drizzle en infraestructura

El schema Drizzle vive en `infrastructure/` — nunca en `domain/`. Las entidades de dominio no saben cómo se persisten. Ver [`frame-orm-in-infrastructure`](~/.claude/skills/clean-architecture/references/frame-orm-in-infrastructure.md).

### Decisiones adicionales

**Client-side only:** En emergencias el backend puede caer. Una SPA estática se sirve desde CDN o localmente. La data crítica se cachea con TanStack Query con `placeholderData` desde mocks locales — la app funciona aunque la API esté caída.

**Endpoints mock activos (sin BD aún):**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/centros` | GET | Centros de acopio con inventario |
| `GET /api/necesidades` | GET | Necesidades públicas con progreso |

Cuando se conecte la BD, reemplazar los arrays `*Mock` en `apps/api/index.ts` con queries Drizzle.

**Monorepo sin complejidad:** Workspace Bun simple. Sin Turborepo ni Nx hasta que haga falta. No diseñamos para requisitos hipotéticos.

---

## Comandos clave

```bash
# Desarrollo
bun dev:api      # Levanta el backend
bun dev:web      # Levanta el frontend

# Base de datos
bun db:push      # Aplica schema sin migración (desarrollo rápido)
bun db:migrate   # Genera y corre migraciones (producción)
bun db:studio    # Drizzle Studio — UI para la BD

# Build
bun build        # Builds de todos los packages
```

---

## Branding

El contexto completo de diseño está en `apps/web/src/assets/branding/BRANDING.md`.

| Token | Hex | Rol |
|-------|-----|-----|
| `brand-primary` | `#2B5F8E` | Azul principal — CTAs, headers, progreso |
| `brand-dark` | `#1E4A6E` | Navy profundo — fondo oscuro |
| `brand-light` | `#4A89C0` | Azul claro — accents, hover |
| `brand-pale` | `#C8DCF0` | Azul muy claro — texto sobre azul oscuro |
| `surface-900` | `#0F2337` | Fondo más oscuro dark mode |

**Fuentes:** `Barlow Condensed` Italic Bold (display) + `DM Sans` (body) + `DM Mono` (números)  
**Sin rojo/naranja:** urgencia = contraste blanco sobre azul + peso tipográfico

---

## Variables de entorno

```env
# apps/api/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/sos_logistica

# apps/web/.env
VITE_API_URL=http://localhost:3000
```
