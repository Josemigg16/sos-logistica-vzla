import type { User } from "../entities/user";

/**
 * Puerto (contrato). La implementación con Drizzle vive en infraestructura.
 * La dependencia apunta hacia adentro: infra conoce al dominio, no al revés.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<boolean>;
}
