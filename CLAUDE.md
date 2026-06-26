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

Usá SIEMPRE estos términos en código, variables, funciones y schemas:

| Término | Representa |
|---------|-----------|
| `Incidente` | Evento de desastre activo |
| `Recurso` | Bien o personal disponible |
| `Operacion` | Misión de respuesta activa |
| `Asignacion` | Vínculo recurso ↔ operación |
| `Prioridad` | Urgencia: `CRITICA` / `ALTA` / `MEDIA` / `BAJA` |
| `Estado` | Ciclo de vida de entidades |
| `Zona` | Área geográfica afectada |
| `CategoriasInventario` | Catálogo de tipos de donaciones/suministros: `Víveres`, `Herramientas`, `Higiene personal`, `Medicamentos`, `Productos de limpieza`, `Abrigo y refugio`, `Artículos para bebés y grupos vulnerables` |

**Nunca usar:** `DataManager`, `RequestHandler`, `ProcessorService`, `Helper`, `Utils`, `Manager`.

---

## Bounded Contexts — módulos

| Módulo | Qué hace |
|--------|---------|
| `incidentes` | Registro y ciclo de vida de desastres |
| `recursos` | Inventario y disponibilidad |
| `operaciones` | Coordinación de respuesta activa |
| `reportes` | Lecturas optimizadas (queries directas, sin pasar por domain) |

---

## Skills cargadas

| Skill | Path | Cuándo aplicar |
|-------|------|---------------|
| Clean Architecture | `.claude/skills/clean-architecture/` | Cualquier decisión de estructura, dependencias, capas |
| Domain-Driven Design | `.claude/skills/domain-driven-design/` | Modelado de entidades, naming, módulos, eventos |

Ante una duda de arquitectura: leer la skill antes de escribir código.

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
