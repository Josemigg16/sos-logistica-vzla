/**
 * Errores del dominio de identidad. Son del negocio, no de HTTP —
 * la capa http los traduce a status codes.
 */
export class IdentityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCredentialsError extends IdentityError {
  constructor() {
    super("Usuario o contraseña inválidos", "INVALID_CREDENTIALS");
  }
}

export class UserSuspendedError extends IdentityError {
  constructor(userId: string) {
    super(`El usuario ${userId} está suspendido`, "USER_SUSPENDED");
  }
}

export class UsernameTakenError extends IdentityError {
  constructor(username: string) {
    super(`El nombre de usuario "${username}" ya existe`, "USERNAME_TAKEN");
  }
}

export class InvalidRefreshTokenError extends IdentityError {
  constructor() {
    super("Sesión inválida o expirada", "INVALID_REFRESH_TOKEN");
  }
}
