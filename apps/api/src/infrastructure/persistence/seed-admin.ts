/**
 * Crea el primer usuario ADMIN para poder arrancar (no hay auto-registro).
 * Uso: SEED_ADMIN_USER=admin SEED_ADMIN_PASS=... bun run seed
 *
 * NOTA: requiere que las tablas ya existan (las migraciones las corre otro).
 */
import { RegisterUser } from "../../application/identity/register-user";
import { DrizzleUserRepository } from "./drizzle-user.repository";
import { BunPasswordHasher } from "../auth/bun-password-hasher";
import { UsernameTakenError } from "../../domain/identity/errors";

const username = process.env.SEED_ADMIN_USER ?? "admin";
const password = process.env.SEED_ADMIN_PASS ?? "changeme123";

const registerUser = new RegisterUser(
  new DrizzleUserRepository(),
  new BunPasswordHasher(),
);

try {
  const user = await registerUser.execute({ username, password, role: "ADMIN" });
  console.log(`✅ Admin creado: ${user.username} (${user.id})`);
} catch (error) {
  if (error instanceof UsernameTakenError) {
    console.log(`ℹ️  El usuario "${username}" ya existe — nada que hacer.`);
  } else {
    console.error("❌ Falló el seed:", error);
    process.exit(1);
  }
}

process.exit(0);
