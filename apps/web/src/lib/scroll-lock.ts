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
    // El body podría estar 'hidden' por residuo previo (HMR, fallo de un cleanup anterior).
    // Si no hay locks activos, lo tratamos como '' para no perpetuar el bloqueo.
    const current = document.body.style.overflow
    originalOverflow = current === 'hidden' ? '' : current
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

// HMR: cuando Vite reemplaza este módulo en caliente, los componentes que
// habían adquirido locks ya no tienen forma de liberarlos. Limpiamos el body
// y reseteamos el contador para evitar que un scroll quede bloqueado al
// recargar el código en dev.
if (typeof document !== 'undefined' && import.meta.hot) {
  import.meta.hot.dispose(() => {
    lockCount = 0
    originalOverflow = null
    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = ''
    }
  })
}

/** Hook: bloquea el scroll del body mientras `active` sea true. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    lockBodyScroll()
    return unlockBodyScroll
  }, [active])
}
