import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";
import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";

type UserRow = typeof users.$inferSelect;

function toDomain(row: UserRow): User {
  return User.rehydrate({
    id: row.id,
    username: row.username,
    credential: Credential.fromHash(row.passwordHash),
    role: Role.create(row.role),
    status: row.status,
    email: row.email,
    cedula: row.cedula ?? null,
    telefono: row.telefono ?? null,
    createdAt: row.createdAt,
  });
}

export class DrizzleUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByCedula(cedula: string): Promise<User | null> {
    const [row] = await db.select().from(users).where(eq(users.cedula, cedula)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<User[]> {
    const rows = await db.select().from(users);
    return rows.map(toDomain);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return result.length > 0;
  }

  async save(user: User): Promise<void> {
    const values = {
      id: user.id,
      username: user.username,
      passwordHash: user.credential.hash,
      role: user.role.value,
      status: user.status,
      email: user.email,
      cedula: user.cedula,
      telefono: user.telefono,
      createdAt: user.createdAt,
    };
    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: values.username,
          passwordHash: values.passwordHash,
          role: values.role,
          status: values.status,
          email: values.email,
          cedula: values.cedula,
          telefono: values.telefono,
        },
      });
  }
}
