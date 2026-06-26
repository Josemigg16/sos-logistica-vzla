# Guía de agentes — SOS Logística

Cómo trabajar con agentes AI en este proyecto. No es necesario conocer Clean Architecture ni DDD en detalle — las skills proveen el contexto. Lo que sí importa: cómo pedirle trabajo a un agente.

---

## Skills disponibles

Las skills están sincronizadas en tres ubicaciones para distintos entornos AI:

| Entorno | Path |
|---------|------|
| Claude Code | `.claude/skills/` |
| Windsurf | `.windsurf/skills/` |
| Agentes genéricos | `.agents/skills/` |

### Clean Architecture

Reglas de estructura, capas y dependencias. Se activa automáticamente al:
- Crear un módulo nuevo
- Definir dónde va una clase
- Revisar imports entre capas

### Domain-Driven Design

Modelado del dominio. Se activa al:
- Nombrar entidades, métodos o módulos
- Diseñar aggregates o relaciones
- Crear domain events
- Definir repositorios

---

## Workflow recomendado con SDD

Para cambios no triviales (nuevas features, refactors de módulo), usar el flujo SDD:

```
/sdd-new <nombre>    → explora y crea propuesta
/sdd-ff <nombre>     → fast-forward: propuesta → spec → diseño → tareas
/sdd-apply <nombre>  → implementa las tareas
/sdd-verify <nombre> → valida contra spec
/sdd-archive         → cierra el cambio
```

Para exploración sin compromiso:
```
/sdd-explore <tema>  → investiga sin crear artefactos
```

---

## Cómo pedir trabajo

### Bien — contexto de dominio

> "Agregá la entidad `Recurso` con su aggregate root. Tiene `cantidad`, `tipo` (VEHICULO / PERSONAL / SUMINISTRO) y `estado` (DISPONIBLE / ASIGNADO / FUERA_DE_SERVICIO). Vivir en `domain/recursos/`."

### Mal — sin contexto

> "Creá una clase para recursos."

La diferencia: el agente con contexto sabe que `Recurso` es un aggregate root, que no puede tener imports de Drizzle, y que `tipo` y `estado` son value objects o enums del dominio.

---

## Reglas que los agentes aplican automáticamente

Al leer `CLAUDE.md` y las skills, cualquier agente respeta:

| Regla | Efecto |
|-------|--------|
| `dep-inward-only` | No sugiere imports de infra en domain |
| `frame-orm-in-infrastructure` | Drizzle solo en `infrastructure/` |
| `entity-no-persistence-awareness` | Entidades sin `@Column`, `@Table` ni schemas Drizzle |
| `adapt-controller-thin` | Handlers Hono que solo llaman use cases |
| `usecase-single-responsibility` | Un use case = una acción de negocio |
| Ubiquitous language | Nombres del dominio, nunca `Manager` / `Helper` |

---

## Contexto de dominio para el agente

Incluir en prompts complejos cuando el agente no tenga contexto previo:

```
Contexto: app de respuesta a desastres naturales.
- Incidente: evento activo (terremoto, inundación, etc.)
- Recurso: bien o personal (vehículos, médicos, suministros)
- Operacion: misión de respuesta coordinada
- Asignacion: recurso asignado a una operación
- Prioridad: CRITICA / ALTA / MEDIA / BAJA
- Categorías de Inventario (Catálogos): Víveres, Herramientas, Higiene personal, Medicamentos, Productos de limpieza, Abrigo y refugio, Artículos para bebés y grupos vulnerables
Stack: Bun, Hono, Drizzle, PostgreSQL, React + TanStack.
Arquitectura: Clean Architecture + DDD (skills en .claude/skills/).
```

---

## Anti-patrones a evitar en prompts

| Pedido | Problema | Alternativa |
|--------|---------|-------------|
| "Creá un service para procesar incidentes" | `Service` es anémico y ambiguo | "Creá el use case `RegistrarIncidente` en `application/incidentes/`" |
| "Conectá el frontend directo a la BD" | Rompe la arquitectura de capas | "Creá un endpoint en Hono que llame al use case" |
| "Ponele un `id` y guardalo en Drizzle" | Persiste sin pasar por domain | "Usá el repositorio de `Incidente` definido en `domain/`" |
| "Hacé un CRUD genérico" | Sin ubiquitous language | Nombrar las operaciones: `RegistrarIncidente`, `CerrarIncidente`, `EscalarPrioridad` |
