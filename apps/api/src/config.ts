/**
 * Configuración de runtime. Lee de variables de entorno (Bun las carga solo).
 * Esto es infraestructura — el dominio nunca lo importa.
 */
export const config = {
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/sos_logistica",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  apiSecret: process.env.API_SECRET ?? "default-api-secret-123",
  accessTokenTtlSeconds: 60 * 15, // 15 minutos
  refreshTokenTtlMs: 1000 * 60 * 60 * 24 * 7, // 7 días
  isProd: process.env.NODE_ENV === "production",
} as const;
