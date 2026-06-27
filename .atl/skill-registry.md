# Skill Registry — sos-logistica-vzla

Generated: 2026-06-27

## Project Convention Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Primary project instructions for Claude Code agents |
| `STACK.md` | Full tech stack documentation |
| `AGENTS.md` | Agent workflow guide, SDD commands, domain context |

---

## User Skills (global — `~/.claude/skills/` & `~/.gemini/skills/`)

> SDD-internal skills (`sdd-*`) are omitted — they are orchestrator-managed.

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review | `branch-pr` | `/Users/josem/.gemini/skills/branch-pr/SKILL.md` |
| When a PR would exceed 400 changed lines, or planning stacked/chained PRs | `chained-pr` | `/Users/josem/.gemini/skills/chained-pr/SKILL.md` |
| Writing guides, READMEs, RFCs, onboarding docs, architecture docs | `cognitive-doc-design` | `/Users/josem/.gemini/skills/cognitive-doc-design/SKILL.md` |
| Drafting PR/issue feedback, review comments, maintainer replies | `comment-writer` | `/Users/josem/.gemini/skills/comment-writer/SKILL.md` |
| Creating GitHub issues, reporting bugs, requesting features | `issue-creation` | `/Users/josem/.gemini/skills/issue-creation/SKILL.md` |
| Adversarial dual review; triggers on "judgment day", "dual review", "juzgar" | `judgment-day` | `/Users/josem/.gemini/skills/judgment-day/SKILL.md` |
| Creating new agent skills, documenting patterns for AI | `skill-creator` | `/Users/josem/.gemini/skills/skill-creator/SKILL.md` |
| Updating skill registry; triggers on "update skills", "skill registry" | `skill-registry` | `/Users/josem/.gemini/skills/skill-registry/SKILL.md` |
| Structuring commits as deliverable units when implementing or splitting PRs | `work-unit-commits` | `/Users/josem/.gemini/skills/work-unit-commits/SKILL.md` |

---

## Project Skills (`.agents/skills/`)

| Skill | Trigger | Priority | Path |
|-------|---------|----------|------|
| `crud-module` | **ALWAYS** on any entity, module, or endpoint creation — the standard 11-layer pattern | MANDATORY | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/crud-module/SKILL.md` |
| `clean-architecture` | Structure decisions, layer boundaries, import rules | HIGH | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/clean-architecture/SKILL.md` |
| `domain-driven-design` | Entity naming, aggregates, bounded contexts, domain events | HIGH | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/domain-driven-design/SKILL.md` |
| `api-data-feeding` | API endpoints, data synchronization, feeding data, or webhook/POST integrations | MEDIUM | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/api-data-feeding/SKILL.md` |
| `build-safety` | Guidelines for preventing build failures in Docker, TypeScript compile errors in frontend, shadowing Map | HIGH | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/build-safety/SKILL.md` |
| `drizzle-orm-patterns` | Any Drizzle ORM query, schema, or migration work | MEDIUM | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/drizzle-orm-patterns/SKILL.md` |
| `hono` | Hono route handlers, middleware, error mapping | MEDIUM | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/hono/SKILL.md` |
| `make-interfaces-feel-better` | Visual detail work, CSS transitions, border radius, optical alignment, typography | MEDIUM | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/make-interfaces-feel-better/SKILL.md` |
| `supabase-postgres-best-practices` | Postgres performance optimization, indexing, query analysis | MEDIUM | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/supabase-postgres-best-practices/SKILL.md` |
| `zod` | Validation schemas, Zod patterns in shared package | MEDIUM | `/Users/josem/Documents/sos/sos-logistica/.agents/skills/zod/SKILL.md` |

---

## Compact Rules (auto-inject into sub-agents)

### crud-module
Every new entity follows the 11-layer order: (1) packages/shared Zod schemas + Public interface → (2) domain entity (private constructor, create/rehydrate/update/toPublic) → (3) domain errors (base + NotFoundError with code string) → (4) repository port (findById/findAll/save/delete) → (5) use cases: Create/List/Update/Delete — one class per file → (6) tests with InMemoryRepo (RED first) → (7) InMemoryRepository → (8) DrizzleRepository → (9) DB schema (uuid PK, timestamptz) → (10) Hono routes (GET=auth only, POST/PUT/DELETE=ADMIN|MANAGER, mapError()) → (11) module factory. Never skip layers. Tests use InMemory adapters — never Drizzle. `id` generated in use case via `crypto.randomUUID()`, not in entity.

### clean-architecture
Dependencies point inward always. `domain/` has zero external imports (no Drizzle, no Hono, no Zod). `infrastructure/` depends on `domain/`, not vice versa. Hono handlers are thin — call use cases only. Drizzle lives in `infrastructure/persistence/` only. One module does not import entities from another; uses IDs or domain events.

### domain-driven-design
Ubiquitous language: Incident, Resource, Operation, Assignment, Priority, Zone, Hub, User/Role/Session. Code in English, UI in Spanish. Never: DataManager, RequestHandler, ProcessorService, Helper, Utils, Manager. Aggregates: Incident (root, owns Victim/Location), Operation (root, owns Assignment), Resource (independent root). Modules: identity, incidents, resources, operations, reports.

### api-data-feeding
API runs on `http://localhost:3000`. GET `/api/centros` lists hubs/destinations. POST `/api/centros` performs upsert by `id` using `centroSchema` validation from `@sos/shared`. Inventories use Spanish UI labels (e.g. "Víveres", "Medicamentos"). Coordenadas are `[longitud, latitud]`.

### build-safety
Never shadow native objects like `Map` in imports (use `globalThis.Map` or component alias `Map as MapComponent`). Ensure all fetch handlers used in query hooks are imported. Mappings like `HUB_TYPE_LABELS` must be updated when new enums/union types are added. Validate local builds with `bun --filter @sos/web build` or `bun build`.

### drizzle-orm-patterns
Define schemas in `infrastructure/persistence/schema/{module}.schema.ts`. Use declarative relation APIs. Mappers (`toDomain`) map database rows to domain entities. Implement upsert in repository `save()` via `.onConflictDoUpdate()`.

### hono
Routes WITHOUT `/api` prefix (e.g. `/auth/...` directly). Validate with `.safeParse(await c.req.json().catch(() => null))`. Map domain errors to HTTP statuses via `ERROR_STATUS` and `mapError`. Handlers must remain thin by delegating to use cases.

### make-interfaces-feel-better
Concentric border radius: `outerRadius = innerRadius + padding`. Optical alignment over geometric alignment. Layered transparent `box-shadow` instead of hard borders. Use interruptible CSS transitions; stagger enter animations with ~100ms delay. Headings use `text-wrap: balance`, dynamic numbers use `font-variant-numeric: tabular-nums`. 40x40px minimum hitbox. Avoid `transition: all`.

### supabase-postgres-best-practices
Design indexes for WHERE, JOIN, and ORDER BY columns. Use partial indexes for specific subsets. Prevent connection leaks. Ensure correct Row-Level Security (RLS) implementation.

### zod
Shared schemas live in `packages/shared/src/{module}.ts`. Formulate creation schemas with validation constraints, then extend updates using `createSchema.partial()`. Export inferred types via `z.infer`.

### TDD (project-wide)
`bun test` is the runner. RED → GREEN → REFACTOR. Write test before use case. Unit tests use `InMemory*Repository` — no Postgres. E2E tests in `apps/api/tests/`. Every entity, use case, and endpoint must have a test. Tests co-located as `*.test.ts`.
