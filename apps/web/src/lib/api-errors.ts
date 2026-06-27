/**
 * Lee una respuesta de error del backend y devuelve un mensaje legible en español.
 *
 * Maneja tres casos:
 *   1) Errores de validación Zod (details.fieldErrors) → traduce mensajes y muestra etiquetas amigables
 *   2) Errores de dominio con `error: string` → devuelve tal cual
 *   3) Respuesta sin cuerpo o no parseable → devuelve `fallback`
 */
export async function readApiError(
  res: Response,
  fallback: string,
  fieldLabels: Record<string, string> = {},
): Promise<string> {
  const body = await res.json().catch(() => null) as
    | { error?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }
    | null

  if (!body) return fallback

  const fieldErrors = body.details?.fieldErrors
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const parts = Object.entries(fieldErrors)
      .filter(([, msgs]) => msgs && msgs.length > 0)
      .map(([field, msgs]) => {
        const label = fieldLabels[field] ?? field
        const raw = msgs?.[0] ?? ''
        return `${label}: ${translateZodMessage(raw)}`
      })
    if (parts.length > 0) return parts.join(' · ')
  }

  const formErrors = body.details?.formErrors
  if (formErrors && formErrors.length > 0) {
    return formErrors.map(translateZodMessage).join(' · ')
  }

  return body.error ?? fallback
}

/**
 * Traduce un mensaje crudo de Zod (en inglés) a español.
 * Maneja patrones dinámicos (mínimo/máximo de caracteres, números, etc.).
 */
export function translateZodMessage(raw: string): string {
  if (!raw) return raw

  const exact = ZOD_EXACT[raw]
  if (exact) return exact

  // Patrones dinámicos
  let m: RegExpMatchArray | null

  m = raw.match(/^String must contain at least (\d+) character\(s\)$/)
  if (m) return `mínimo ${m[1]} caracteres`

  m = raw.match(/^String must contain at most (\d+) character\(s\)$/)
  if (m) return `máximo ${m[1]} caracteres`

  m = raw.match(/^String must contain exactly (\d+) character\(s\)$/)
  if (m) return `debe tener ${m[1]} caracteres`

  m = raw.match(/^Number must be greater than (-?\d+(?:\.\d+)?)$/)
  if (m) return `debe ser mayor que ${m[1]}`

  m = raw.match(/^Number must be greater than or equal to (-?\d+(?:\.\d+)?)$/)
  if (m) return `mínimo ${m[1]}`

  m = raw.match(/^Number must be less than (-?\d+(?:\.\d+)?)$/)
  if (m) return `debe ser menor que ${m[1]}`

  m = raw.match(/^Number must be less than or equal to (-?\d+(?:\.\d+)?)$/)
  if (m) return `máximo ${m[1]}`

  m = raw.match(/^Array must contain at least (\d+) element\(s\)$/)
  if (m) return `mínimo ${m[1]} elementos`

  m = raw.match(/^Invalid enum value\. Expected (.+?), received '(.+?)'$/)
  if (m) return `valor inválido (esperado: ${m[1]})`

  return raw
}

const ZOD_EXACT: Record<string, string> = {
  'Required': 'requerido',
  'Invalid input': 'valor inválido',
  'Invalid email': 'email inválido',
  'Invalid url': 'URL inválida',
  'Invalid uuid': 'identificador inválido',
  'Invalid date': 'fecha inválida',
  'Expected string, received number': 'debe ser texto',
  'Expected number, received string': 'debe ser un número',
  'Expected number, received nan': 'debe ser un número válido',
  'Expected boolean, received string': 'debe ser verdadero o falso',
  'Number must be positive': 'debe ser mayor que cero',
  'Number must be negative': 'debe ser menor que cero',
  'Number must be a positive number': 'debe ser positivo',
  'Number must be an integer': 'debe ser un número entero',
}
