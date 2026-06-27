---
name: crud-module
description: >
  ALWAYS ACTIVE for this project. Enforces the standard Clean Architecture CRUD pattern:
  shared types (Zod + interfaces) → domain entity + repository port → use cases (create/list/update/delete)
  → in-memory + Drizzle repositories → Hono routes → module factory → tests with InMemory adapters.
  Trigger on ANY new entity, feature, endpoint, or module creation.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# CRUD Module Pattern

This project follows a strict layered CRUD pattern. Every new entity MUST implement all layers in order.

## Trigger

Activate this skill whenever:
- A new entity or resource is being created
- A new bounded context / module is being added
- New endpoints are being added to an existing module
- The user says "hacer CRUD", "agregar entidad", "nuevo módulo", "new feature", "crear endpoints"

## Layer Order (mandatory)

```
1. packages/shared/src/{module}.ts         → Zod schemas + Public interfaces
2. domain/{module}/entities/{Entity}.ts    → Rich entity class
3. domain/{module}/errors.ts               → Domain errors with code string
4. domain/{module}/repositories/{Entity}.repository.ts  → Port interface
5. application/{module}/create-{entity}.ts
   application/{module}/list-{entities}.ts
   application/{module}/update-{entity}.ts
   application/{module}/delete-{entity}.ts
6. application/{module}/{module}.test.ts   → TDD with InMemory repos (RED first)
7. infrastructure/persistence/in-memory-{entity}.repository.ts
8. infrastructure/persistence/drizzle-{entity}.repository.ts
9. infrastructure/persistence/schema/{module}.schema.ts (if new table)
10. infrastructure/http/{module}.routes.ts
11. infrastructure/{module}.module.ts
```

## Rules

- **Never skip layers** — domain must not import from infrastructure
- **Tests use InMemory repos** — never Drizzle in unit tests
- **TDD cycle** — write the test first (RED), then the use case (GREEN)
- **One use case per file** — `CreateX`, `ListXs`, `UpdateX`, `DeleteX` are separate classes
- **Shared package owns types** — Zod schemas live in `packages/shared/src/{module}.ts`
- **Module factory wires everything** — `infrastructure/{module}.module.ts` composes repos + use cases + routes

---

## Layer 1 — Shared Types (`packages/shared/src/{module}.ts`)

```typescript
import { z } from "zod";

export const create{Entity}Schema = z.object({
  nombre: z.string().trim().min(1).max(80),
  // ... other fields
});
export type Create{Entity}Request = z.infer<typeof create{Entity}Schema>;

export const update{Entity}Schema = create{Entity}Schema.partial();
export type Update{Entity}Request = z.infer<typeof update{Entity}Schema>;

export interface Public{Entity} {
  id: string;
  nombre: string;
  createdAt: string;  // always ISO string, never Date
}
```

**Rules:**
- `createSchema` defines required fields with Zod constraints
- `updateSchema = createSchema.partial()` unless fields differ meaningfully
- `Public{Entity}` uses `string` for dates (`.toISOString()`)
- Export from `packages/shared/src/index.ts`

---

## Layer 2 — Domain Entity (`domain/{module}/entities/{Entity}.ts`)

```typescript
import type { Public{Entity} } from "@sos/shared";

export interface {Entity}Props {
  id: string;
  nombre: string;
  createdAt: Date;
}

export class {Entity} {
  private constructor(private props: {Entity}Props) {}

  static create(input: { id: string; nombre: string }): {Entity} {
    return new {Entity}({ ...input, createdAt: new Date() });
  }

  static rehydrate(props: {Entity}Props): {Entity} {
    return new {Entity}(props);
  }

  get id(): string { return this.props.id; }
  get nombre(): string { return this.props.nombre; }
  get createdAt(): Date { return this.props.createdAt; }

  update(data: { nombre?: string }): void {
    if (data.nombre !== undefined) this.props.nombre = data.nombre;
  }

  toPublic(): Public{Entity} {
    return {
      id: this.props.id,
      nombre: this.props.nombre,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
```

**Rules:**
- Private constructor — use `create()` for new, `rehydrate()` for persistence
- `create()` generates `id` via `crypto.randomUUID()` in the **use case**, not here
- `update()` mutates only provided fields
- `toPublic()` maps to the shared `Public{Entity}` type

---

## Layer 3 — Domain Errors (`domain/{module}/errors.ts`)

```typescript
export class {Module}Error extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class {Entity}NotFoundError extends {Module}Error {
  constructor(id: string) {
    super(`{Entity} no encontrado: ${id}`, "{ENTITY}_NOT_FOUND");
  }
}
```

**Rules:**
- Base error class per module (e.g., `FleetError`, `IdentityError`)
- `code` is a SCREAMING_SNAKE_CASE string used in HTTP error mapping
- Message is in Spanish (user-facing)

---

## Layer 4 — Repository Port (`domain/{module}/repositories/{Entity}.repository.ts`)

```typescript
import type { {Entity} } from "../entities/{entity}";

export interface {Entity}Repository {
  findById(id: string): Promise<{Entity} | null>;
  findAll(): Promise<{Entity}[]>;
  save({entity}: {Entity}): Promise<void>;
  delete(id: string): Promise<void>;
}
```

**Rules:**
- Pure interface — no implementation details
- `save()` handles both create and update (upsert pattern)
- `findById()` returns `null` (not throwing) when not found

---

## Layer 5 — Use Cases (`application/{module}/`)

### create-{entity}.ts
```typescript
import type { Create{Entity}Request, Public{Entity} } from "@sos/shared";
import type { {Entity}Repository } from "../../domain/{module}/repositories/{entity}.repository";
import { {Entity} } from "../../domain/{module}/entities/{entity}";

export class Create{Entity} {
  constructor(private readonly {entities}: {Entity}Repository) {}

  async execute(command: Create{Entity}Request): Promise<Public{Entity}> {
    const {entity} = {Entity}.create({
      id: crypto.randomUUID(),
      nombre: command.nombre,
    });
    await this.{entities}.save({entity});
    return {entity}.toPublic();
  }
}
```

### list-{entities}.ts
```typescript
import type { Public{Entity} } from "@sos/shared";
import type { {Entity}Repository } from "../../domain/{module}/repositories/{entity}.repository";

export class List{Entities} {
  constructor(private readonly {entities}: {Entity}Repository) {}

  async execute(): Promise<Public{Entity}[]> {
    const all = await this.{entities}.findAll();
    return all.map(e => e.toPublic());
  }
}
```

### update-{entity}.ts
```typescript
import type { Update{Entity}Request, Public{Entity} } from "@sos/shared";
import type { {Entity}Repository } from "../../domain/{module}/repositories/{entity}.repository";
import { {Entity}NotFoundError } from "../../domain/{module}/errors";

export class Update{Entity} {
  constructor(private readonly {entities}: {Entity}Repository) {}

  async execute(id: string, command: Update{Entity}Request): Promise<Public{Entity}> {
    const {entity} = await this.{entities}.findById(id);
    if (!{entity}) throw new {Entity}NotFoundError(id);
    {entity}.update(command);
    await this.{entities}.save({entity});
    return {entity}.toPublic();
  }
}
```

### delete-{entity}.ts
```typescript
import type { {Entity}Repository } from "../../domain/{module}/repositories/{entity}.repository";
import { {Entity}NotFoundError } from "../../domain/{module}/errors";

export class Delete{Entity} {
  constructor(private readonly {entities}: {Entity}Repository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.{entities}.findById(id);
    if (!existing) throw new {Entity}NotFoundError(id);
    await this.{entities}.delete(id);
  }
}
```

---

## Layer 6 — Tests (`application/{module}/{module}.test.ts`)

**Write tests BEFORE use cases. RED first.**

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import { Create{Entity} } from "./create-{entity}";
import { List{Entities} } from "./list-{entities}";
import { Update{Entity} } from "./update-{entity}";
import { Delete{Entity} } from "./delete-{entity}";
import { InMemory{Entity}Repository } from "../../infrastructure/persistence/in-memory-{entity}.repository";
import { {Entity}NotFoundError } from "../../domain/{module}/errors";

describe("{Entity} use cases", () => {
  let repo: InMemory{Entity}Repository;
  let create: Create{Entity};
  let list: List{Entities};
  let update: Update{Entity};
  let remove: Delete{Entity};

  beforeEach(() => {
    repo = new InMemory{Entity}Repository();
    create = new Create{Entity}(repo);
    list = new List{Entities}(repo);
    update = new Update{Entity}(repo);
    remove = new Delete{Entity}(repo);
  });

  test("creates a {entity}", async () => {
    const result = await create.execute({ nombre: "Test" });
    expect(result.nombre).toBe("Test");
    expect(result.id).toBeTruthy();
  });

  test("lists {entities}", async () => {
    await create.execute({ nombre: "A" });
    await create.execute({ nombre: "B" });
    const all = await list.execute();
    expect(all).toHaveLength(2);
  });

  test("updates a {entity}", async () => {
    const created = await create.execute({ nombre: "Viejo" });
    const updated = await update.execute(created.id, { nombre: "Nuevo" });
    expect(updated.nombre).toBe("Nuevo");
  });

  test("throws {Entity}NotFoundError on update of missing {entity}", async () => {
    await expect(update.execute("bad-id", { nombre: "X" })).rejects.toBeInstanceOf({Entity}NotFoundError);
  });

  test("deletes a {entity}", async () => {
    const created = await create.execute({ nombre: "A" });
    await remove.execute(created.id);
    expect(await list.execute()).toHaveLength(0);
  });

  test("throws {Entity}NotFoundError on delete of missing {entity}", async () => {
    await expect(remove.execute("bad-id")).rejects.toBeInstanceOf({Entity}NotFoundError);
  });
});
```

---

## Layer 7 — InMemory Repository (`infrastructure/persistence/in-memory-{entity}.repository.ts`)

```typescript
import type { {Entity}Repository } from "../../domain/{module}/repositories/{entity}.repository";
import type { {Entity} } from "../../domain/{module}/entities/{entity}";

export class InMemory{Entity}Repository implements {Entity}Repository {
  private store = new Map<string, {Entity}>();

  async findById(id: string): Promise<{Entity} | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<{Entity}[]> {
    return Array.from(this.store.values());
  }
  async save({entity}: {Entity}): Promise<void> {
    this.store.set({entity}.id, {entity});
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
```

---

## Layer 8 — Drizzle Repository (`infrastructure/persistence/drizzle-{entity}.repository.ts`)

```typescript
import { eq } from "drizzle-orm";
import { db } from "./db";
import { {tableName} } from "./schema";
import type { {Entity}Repository } from "../../domain/{module}/repositories/{entity}.repository";
import { {Entity} } from "../../domain/{module}/entities/{entity}";

type Row = typeof {tableName}.$inferSelect;

function toDomain(row: Row): {Entity} {
  return {Entity}.rehydrate({
    id: row.id,
    nombre: row.nombre,
    createdAt: row.createdAt,
  });
}

export class Drizzle{Entity}Repository implements {Entity}Repository {
  async findById(id: string): Promise<{Entity} | null> {
    const [row] = await db.select().from({tableName}).where(eq({tableName}.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<{Entity}[]> {
    const rows = await db.select().from({tableName});
    return rows.map(toDomain);
  }

  async save({entity}: {Entity}): Promise<void> {
    const values = { id: {entity}.id, nombre: {entity}.nombre, createdAt: {entity}.createdAt };
    await db
      .insert({tableName})
      .values(values)
      .onConflictDoUpdate({ target: {tableName}.id, set: { nombre: values.nombre } });
  }

  async delete(id: string): Promise<void> {
    await db.delete({tableName}).where(eq({tableName}.id, id));
  }
}
```

---

## Layer 9 — DB Schema (`infrastructure/persistence/schema/{module}.schema.ts`)

```typescript
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const {tableName} = pgTable("{table_name_snake}", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 80 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**After adding schema:** run `bun db:push` (dev) or `bun db:migrate` (prod).

---

## Layer 10 — Hono Routes (`infrastructure/http/{module}.routes.ts`)

```typescript
import { Hono } from "hono";
import type { Context } from "hono";
import { create{Entity}Schema, update{Entity}Schema } from "@sos/shared";
import type { Create{Entity} } from "../../application/{module}/create-{entity}";
import type { List{Entities} } from "../../application/{module}/list-{entities}";
import type { Update{Entity} } from "../../application/{module}/update-{entity}";
import type { Delete{Entity} } from "../../application/{module}/delete-{entity}";
import { {Module}Error } from "../../domain/{module}/errors";
import { authentication, requireRole, type AuthEnv } from "./middleware/authentication";

export interface {Module}RoutesDeps {
  create{Entity}: Create{Entity};
  list{Entities}: List{Entities};
  update{Entity}: Update{Entity};
  delete{Entity}: Delete{Entity};
}

const ERROR_STATUS: Record<string, 400 | 404 | 409> = {
  {ENTITY}_NOT_FOUND: 404,
};

function mapError(c: Context, error: unknown) {
  if (error instanceof {Module}Error) {
    const status = ERROR_STATUS[(error as any).code] ?? 400;
    return c.json({ error: error.message, code: (error as any).code }, status);
  }
  console.error("Error inesperado en {module}:", error);
  return c.json({ error: "Error interno" }, 500);
}

export function create{Module}Routes(deps: {Module}RoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  router.get("/{entities}", authentication, async (c) => {
    try {
      return c.json({ {entities}: await deps.list{Entities}.execute() });
    } catch (error) { return mapError(c, error); }
  });

  router.post("/{entities}", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = create{Entity}Schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    try {
      return c.json({ {entity}: await deps.create{Entity}.execute(parsed.data) }, 201);
    } catch (error) { return mapError(c, error); }
  });

  router.put("/{entities}/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    const parsed = update{Entity}Schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400);
    try {
      return c.json({ {entity}: await deps.update{Entity}.execute(c.req.param("id"), parsed.data) });
    } catch (error) { return mapError(c, error); }
  });

  router.delete("/{entities}/:id", authentication, requireRole("ADMIN", "MANAGER"), async (c) => {
    try {
      await deps.delete{Entity}.execute(c.req.param("id"));
      return c.json({ ok: true });
    } catch (error) { return mapError(c, error); }
  });

  return router;
}
```

**Rules:**
- `GET` — no role required (authentication only)
- `POST/PUT/DELETE` — `requireRole("ADMIN", "MANAGER")`
- Validate with `.safeParse(await c.req.json().catch(() => null))`
- Response keys match entity name (singular for single, plural for list)

---

## Layer 11 — Module Factory (`infrastructure/{module}.module.ts`)

```typescript
import { Create{Entity} } from "../application/{module}/create-{entity}";
import { List{Entities} } from "../application/{module}/list-{entities}";
import { Update{Entity} } from "../application/{module}/update-{entity}";
import { Delete{Entity} } from "../application/{module}/delete-{entity}";
import { Drizzle{Entity}Repository } from "./persistence/drizzle-{entity}.repository";
import { create{Module}Routes } from "./http/{module}.routes";

export function create{Module}Module() {
  const {entities} = new Drizzle{Entity}Repository();

  const useCases = {
    create{Entity}: new Create{Entity}({entities}),
    list{Entities}: new List{Entities}({entities}),
    update{Entity}: new Update{Entity}({entities}),
    delete{Entity}: new Delete{Entity}({entities}),
  };

  return { useCases, routes: create{Module}Routes(useCases) };
}
```

---

## Checklist (verify before closing any CRUD task)

- [ ] Shared: Zod schemas + Public interface exported from `packages/shared/src/index.ts`
- [ ] Domain entity: `create()`, `rehydrate()`, `update()`, `toPublic()`
- [ ] Domain errors: base class + `NotFoundError` with `code` string
- [ ] Repository port: `findById`, `findAll`, `save`, `delete`
- [ ] Use cases: Create, List, Update, Delete — one class per file
- [ ] Tests: 6 scenarios, InMemory repos, all passing (`bun test`)
- [ ] InMemory repo: `Map<string, Entity>` store
- [ ] Drizzle repo: `toDomain()` mapper, `onConflictDoUpdate` in `save()`
- [ ] Schema: `uuid` PK, `timestamp with timezone` for dates
- [ ] Routes: GET (auth only), POST/PUT/DELETE (ADMIN|MANAGER), `mapError()`
- [ ] Module factory: wires repos → use cases → routes

## References

- [references/entity-pattern.md](references/entity-pattern.md) — Entity class deep dive
- [references/test-pattern.md](references/test-pattern.md) — TDD cycle details
- [references/routes-pattern.md](references/routes-pattern.md) — Route error handling
