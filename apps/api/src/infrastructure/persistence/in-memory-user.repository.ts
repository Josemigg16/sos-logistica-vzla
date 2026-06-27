import type { UserRepository } from "../../domain/identity/repositories/user.repository";
import type { User } from "../../domain/identity/entities/user";

/**
 * Adapter in-memory del puerto UserRepository. Útil para tests y para correr
 * la API sin Postgres. Misma interfaz que el adapter de Drizzle.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    for (const user of this.byId.values()) {
      if (user.username === username) return user;
    }
    return null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.byId.values());
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user);
  }

  async delete(id: string): Promise<boolean> {
    return this.byId.delete(id);
  }
}
