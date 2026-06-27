import { useEffect } from 'react'

/**
 * Bloqueo del scroll del body con contador global.
 *
 * Múltiples componentes (modales, drawers, sheets) pueden pedir bloqueo a la vez.
 * Mientras al menos UNO esté activo, el body queda con `overflow: hidden`.
 * Cuando el último libera, restauramos el valor original que tenía el body
 * antes del PRIMER lock — no el de cada llamada — para evitar el bug clásico
 * de "el modal X capturó 'hidden' como prev porque otro modal estaba abierto,
 * y al cerrarse lo restauró a 'hidden'".
 *
 * Usar el hook `useScrollLock(active)` desde cualquier modal/drawer.
 */

let lockCount = 0
let originalOverflow: string | null = null

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow ?? ''
    originalOverflow = null
  }
}

/** Hook: bloquea el scroll del body mientras `active` sea true. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    lockBodyScroll()
    return unlockBodyScroll
  }, [active])
}
