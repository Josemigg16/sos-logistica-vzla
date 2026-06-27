/**
 * Base URL de la API. En dev usa el default; en build Vite reemplaza
 * `import.meta.env.VITE_API_URL`. Bajo `bun test` no hay env de Vite, por eso
 * el optional chaining.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export const API_URL = env?.VITE_API_URL ?? "http://localhost:3000";
