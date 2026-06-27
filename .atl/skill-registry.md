# Skill Registry — sos-logistica-vzla

Generated: 2026-06-27

## Project Convention Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Primary project instructions for Claude Code agents |
| `STACK.md` | Full tech stack documentation |
| `AGENTS.md` | Agent workflow guide, SDD commands, domain context |

---

## User Skills (global — `~/.claude/skills/`)

> SDD-internal skills (`sdd-*`) are omitted — they are orchestrator-managed.

| Skill | Trigger |
|-------|---------|
| `branch-pr` | When creating a pull request, opening a PR, or preparing changes for review |
| `chained-pr` | When a PR would exceed 400 changed lines, or planning stacked/chained PRs |
| `clean-architecture` | Any decision about layers, boundaries, dependency direction, entities, use cases |
| `clean-code` | Transforming working code into clean code; code review for readability |
| `cognitive-doc-design` | Writing guides, READMEs, RFCs, onboarding docs, architecture docs |
| `comment-writer` | Drafting PR/issue feedback, review comments, maintainer replies |
| `find-skills` | When user asks "how do I do X" or "find a skill for X" |
| `frontend-design` | Building web components, pages, dashboards, React components, HTML/CSS |
| `issue-creation` | Creating GitHub issues, reporting bugs, requesting features |
| `judgment-day` | Adversarial dual review; triggers on "judgment day", "dual review", "juzgar" |
| `skill-creator` | Creating new agent skills, documenting patterns for AI |
| `skill-registry` | Updating skill registry; triggers on "update skills", "skill registry" |
| `work-unit-commits` | Structuring commits as deliverable units when implementing or splitting PRs |

---

## Project Skills (`.claude/skills/`)

| Skill | Trigger | Priority |
|-------|---------|---------|
| `crud-module` | **ALWAYS** on any entity, module, or endpoint creation — the standard 11-layer pattern | MANDATORY |
| `clean-architecture` | Structure decisions, layer boundaries, import rules (overrides global) | HIGH |
| `domain-driven-design` | Entity naming, aggregates, bounded contexts, domain events | HIGH |
| `drizzle-orm-patterns` | Any Drizzle ORM query, schema, or migration work | MEDIUM |
| `hono` | Hono route handlers, middleware, error mapping | MEDIUM |
| `zod` | Validation schemas, Zod patterns in shared package | MEDIUM |

---

## Compact Rules (auto-inject into sub-agents)

### crud-module
Every new entity follows the 11-layer order: (1) packages/shared Zod schemas + Public interface → (2) domain entity (private constructor, create/rehydrate/update/toPublic) → (3) domain errors (base + NotFoundError with code string) → (4) repository port (findById/findAll/save/delete) → (5) use cases: Create/List/Update/Delete — one class per file → (6) tests with InMemoryRepo (RED first) → (7) InMemoryRepository → (8) DrizzleRepository → (9) DB schema (uuid PK, timestamptz) → (10) Hono routes (GET=auth only, POST/PUT/DELETE=ADMIN|MANAGER, mapError()) → (11) module factory. Never skip layers. Tests use InMemory adapters — never Drizzle. `id` generated in use case via `crypto.randomUUID()`, not in entity.

### clean-architecture
Dependencies point inward always. `domain/` has zero external imports (no Drizzle, no Hono, no Zod). `infrastructure/` depends on `domain/`, not vice versa. Hono handlers are thin — call use cases only. Drizzle lives in `infrastructure/persistence/` only. One module does not import entities from another; uses IDs or domain events.

### domain-driven-design
Ubiquitous language: Incident, Resource, Operation, Assignment, Priority, Zone, Hub, User/Role/Session. Code in English, UI in Spanish. Never: DataManager, RequestHandler, ProcessorService, Helper, Utils, Manager. Aggregates: Incident (root, owns Victim/Location), Operation (root, owns Assignment), Resource (independent root). Modules: identity, incidents, resources, operations, reports.

### hono
Routes WITHOUT /api prefix — start directly: /auth/..., /resources/..., etc. Never prefix with /api. Validate with `.safeParse(await c.req.json().catch(() => null))`. Map domain errors to HTTP status via ERROR_STATUS record. Thin handlers only — delegate to use cases.

### TDD (project-wide)
`bun test` is the runner. RED → GREEN → REFACTOR. Write test before use case. Unit tests use `InMemory*Repository` — no Postgres. E2E tests in `apps/api/tests/`. Every entity, use case, and endpoint must have a test. Tests co-located as `*.test.ts`.
