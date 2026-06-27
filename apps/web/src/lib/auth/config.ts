/**
 * Base URL de la API. Same-origin bajo `/api`: el proxy inverso (nginx en el
 * VPS, server.proxy de Vite en dev) reenvía `/api/*` al backend. Por eso el
 * default es relativo y la MISMA build sirve para dev, test y prod.
 * Bajo `bun test` no hay env de Vite, por eso el optional chaining.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export const API_URL = env?.VITE_API_URL ?? "/api";
