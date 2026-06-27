# SOS Logística — Instrucciones para agentes

App de gestión logística para respuesta a desastres naturales. Velocidad de desarrollo es prioridad — pero sin romper la arquitectura.

Stack completo: ver [STACK.md](./STACK.md).
Guía de agentes: ver [agents.md](./agents.md).

---

## Reglas de desarrollo

- Runtime: **Bun** — nunca Node ni npm
- Sin build después de cambios
- Conventional commits únicamente, sin Co-Authored-By ni atribución AI
- No crear archivos de documentación salvo que se pida explícitamente
- **Código en inglés, UI en español.** Excepción: siglas/nombres propios sin traducción (`ZODI`).

---

## TDD (activado — no negociable)

Este proyecto trabaja **test-first**. El ciclo es **RED → GREEN → REFACTOR**:

1. **RED** — escribí el test que falla ANTES del código de producción.
2. **GREEN** — el mínimo código para que pase.
3. **REFACTOR** — limpiá con los tests en verde.

- Runner: `bun test`. Tests `*.test.ts` co-locados (unit) o en `tests/` (e2e).
- Ningún use case, entidad ni endpoint se da por hecho sin su test.
- Tests sin Postgres: usar los adapters in-memory (`InMemory*Repository`) — implementan los mismos puertos que Drizzle.
- Antes de cerrar un cambio: `bun test` en verde. Si está rojo, no está hecho.

---

## Arquitectura (no negociable)

Este proyecto usa **Clean Architecture + DDD**. Las skills están en `.claude/skills/`.

### Reglas críticas

1. **Las dependencias apuntan hacia adentro siempre** — `domain/` no importa nada de `infrastructure/` ni frameworks
2. **Drizzle vive en `infrastructure/`** — nunca en `domain/` ni `application/`
3. **Hono handlers son thin** — delegan a use cases, no contienen lógica de negocio
4. **Un módulo no importa entidades de otro** — se comunica por IDs o domain events

### Estructura obligatoria del backend

```
apps/api/src/
├── domain/          # Entidades, value objects, reglas puras — cero imports externos
├── application/     # Use cases — orquesta, no implementa
├── infrastructure/  # Drizzle, Hono routes, adapters
└── shared/          # Tipos cruzados
```

---

## Lenguaje ubicuo

**El código va en inglés; la UI en español.** El concepto del negocio se piensa
en español (así habla el coordinador), pero el identificador en código es su
traducción al inglés. Usá SIEMPRE el término de la columna "Código":

| Concepto (negocio) | Código (inglés) | Representa |
|--------------------|-----------------|-----------|
| Incidente | `Incident` | Evento de desastre activo |
| Recurso | `Resource` | Bien o personal disponible |
| Operación | `Operation` | Misión de respuesta activa |
| Asignación | `Assignment` | Vínculo recurso ↔ operación |
| Prioridad | `Priority` → `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` | Urgencia |
| Estado | `Status` | Ciclo de vida de entidades |
| Zona | `Zone` | Área geográfica afectada |
| Centro de acopio | `Hub` (rol `HUB_COORDINATOR`) | Punto de recolección de donativos |
| Categorías de inventario | `InventoryCategory` | Catálogo de tipos de suministros (los valores son labels de UI, en español) |
| Usuario / Rol / Sesión | `User` / `Role` / `Session` | Bounded context `identity` |

**Excepción — siglas y nombres propios NO se traducen:** `ZODI` se queda `ZODI`
en código (es una sigla institucional, como `FBI`).

**Nunca usar:** `DataManager`, `RequestHandler`, `ProcessorService`, `Helper`, `Utils`, `Manager`.

---

## Bounded Contexts — módulos

| Módulo | Qué hace |
|--------|---------|
| `identity` | Identidad y acceso: usuarios, roles, autenticación |
| `incidents` | Registro y ciclo de vida de desastres |
| `resources` | Inventario y disponibilidad |
| `operations` | Coordinación de respuesta activa |
| `reports` | Lecturas optimizadas (queries directas, sin pasar por domain) |

---

## Skills cargadas

| Skill | Path | Cuándo aplicar |
|-------|------|---------------|
| **CRUD Module** | `.claude/skills/crud-module/` | **SIEMPRE** al crear entidades, módulos o endpoints — es el patrón estándar del proyecto |
| Clean Architecture | `.claude/skills/clean-architecture/` | Cualquier decisión de estructura, dependencias, capas |
| Domain-Driven Design | `.claude/skills/domain-driven-design/` | Modelado de entidades, naming, módulos, eventos |

Ante una duda de arquitectura: leer la skill antes de escribir código.

> **La skill `crud-module` es la fuente de verdad del patrón de implementación.**
> Toda entidad nueva sigue sus 11 capas sin excepción.

---

## Frontend — rutas activas

El router es **TanStack Router v1 file-based**. Las rutas viven en `apps/web/src/routes/`.
`routeTree.gen.ts` se genera automáticamente — **nunca editarlo a mano**.

| Ruta | Archivo | Página |
|------|---------|--------|
| `/` | `routes/index.tsx` | Panel público de necesidades (página principal) |
| `/map` | `routes/map.tsx` | Mapa de centros de acopio |

---

## Comandos

```bash
bun dev:api        # Backend
bun dev:web        # Frontend
bun db:push        # Schema sin migración (dev)
bun db:migrate     # Migraciones (prod)
bun db:studio      # UI de base de datos
bun test           # Tests
```
